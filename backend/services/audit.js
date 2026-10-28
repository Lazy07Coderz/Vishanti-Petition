
import { createHash } from "node:crypto";
import mongoose from "mongoose";

import Complaint from "../models/complaint.js";
import AuditEvent from "../models/auditEvent.js";

export const GENESIS_HASH = "0".repeat(64);

function canonical(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Array.isArray(value)) {
        return value.map(canonical);
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map(key => [
                    key,
                    canonical(value[key])
                ])
        );
    }

    return value;
}

export function eventHash(event) {
    const payload = {
        complaint: String(event.complaint),
        sequence: event.sequence,
        type: event.type,
        actor: event.actor
            ? String(event.actor)
            : null,
        actorRole: event.actorRole,
        occurredAt: new Date(
            event.occurredAt
        ).toISOString(),
        details: canonical(event.details),
        previousHash: event.previousHash
    };

    return createHash("sha256")
        .update(JSON.stringify(payload))
        .digest("hex");
}

export async function appendAudit(
    complaint,
    session,
    type,
    actor,
    actorRole,
    details
) {
    const event = {
        complaint: complaint._id,
        sequence: (complaint.auditSequence || 0) + 1,
        type,
        actor: actor || null,
        actorRole,
        occurredAt: new Date(),
        details,
        previousHash:
            complaint.auditHash || GENESIS_HASH
    };

    event.hash = eventHash(event);

    await AuditEvent.create(
        [event],
        { session }
    );

    complaint.auditSequence = event.sequence;
    complaint.auditHash = event.hash;
}

export async function baselineIfNeeded(
    complaint,
    session
) {
    if ((complaint.auditSequence || 0) > 0) {
        return;
    }

    await appendAudit(
        complaint,
        session,
        "BASELINE",
        null,
        "SYSTEM",
        {
            explanation:
                "Existing petition when audit logging first became active; earlier activity is not verified",
            status: complaint.status,
            priority: complaint.priority,
            slaDeadline:
                complaint.slaDeadline?.toISOString() || null,
            originalCreatedAt:
                complaint.createdAt?.toISOString() || null
        }
    );
}

export async function recordOverdueIfNeeded(id) {
    let recorded = false;

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            recorded = false;

            const complaint = await Complaint.findById(id)
                .session(session);

            if (!complaint || complaint.slaOverdueLogged) {
                return;
            }

            if (![
                "FILED",
                "ASSIGNED",
                "IN_REVIEW"
            ].includes(complaint.status)) {
                return;
            }

            if (
                !complaint.slaDeadline ||
                complaint.slaDeadline > new Date()
            ) {
                return;
            }

            await baselineIfNeeded(
                complaint,
                session
            );

            complaint.slaOverdueLogged = true;

            await appendAudit(
                complaint,
                session,
                "SLA_OVERDUE",
                null,
                "SYSTEM",
                {
                    deadline:
                        complaint.slaDeadline.toISOString(),
                    status: complaint.status,
                    priority: complaint.priority
                }
            );

            await complaint.save({ session });
            recorded = true;
        });

    } finally {
        await session.endSession();
    }

    return recorded;
}

export async function auditHistory(complaint) {
    const events = await AuditEvent.find({
        complaint: complaint._id
    })
        .sort({ sequence: 1 })
        .lean();

    if (
        !events.length &&
        !complaint.auditSequence
    ) {
        return {
            verified: false,
            legacyUntracked: true,
            message:
                "This petition predates audit logging; no verified history is available yet.",
            events: []
        };
    }

    let lastHash = GENESIS_HASH;
    let verified = true;

    for (let i = 0; i < events.length; i++) {
        const entry = events[i];

        if (
            entry.sequence !== i + 1 ||
            entry.previousHash !== lastHash ||
            eventHash(entry) !== entry.hash
        ) {
            verified = false;
        }

        lastHash = entry.hash;
    }

    if (
        complaint.auditSequence !== events.length ||
        complaint.auditHash !== lastHash ||
        events[0]?.previousHash !== GENESIS_HASH
    ) {
        verified = false;
    }

    return {
        verified,
        legacyUntracked: false,
        message: verified
            ? "Stored hash chain verified"
            : "Audit integrity check failed",

        events: events.map(event => ({
            sequence: event.sequence,
            type: event.type,
            actorRole: event.actorRole,
            occurredAt: event.occurredAt,
            details: event.details,
            previousHash: event.previousHash,
            hash: event.hash
        }))
    };
}
