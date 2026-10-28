
export const SLA_HOURS = {
    High: 24,
    Medium: 48,
    Low: 72
};

export function calculateSlaDeadline(createdAt, priority) {
    const hours = SLA_HOURS[priority];

    if (!hours) {
        throw new Error("Invalid priority");
    }

    return new Date(
        new Date(createdAt).getTime() +
        hours * 60 * 60 * 1000
    );
}
