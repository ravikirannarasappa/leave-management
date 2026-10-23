import cds from "@sap/cds";

const { SELECT } = cds.ql;

export default class LeaveService extends cds.ApplicationService {
  init() {
    const { LeaveRequests, LeaveBalances } = this.entities;

    // Runs before a new leave request is saved
    this.before("CREATE", LeaveRequests, async (req) => {
      const { employee_ID, leaveType_ID, startDate, endDate } = req.data;

      if (!employee_ID || !leaveType_ID || !startDate || !endDate) {
        return req.error(400, "Employee, leave type, start date and end date are required");
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end < start) {
        return req.error(400, "End date cannot be before start date");
      }

      // Days between the dates, counting both start and end day
      const days = Math.round((end - start) / 86400000) + 1;
      req.data.days = days;
      req.data.status = "Pending";

      // Check the leave balance
      const balance = await SELECT.one.from(LeaveBalances).where({
        employee_ID,
        leaveType_ID,
        year: start.getFullYear(),
      });

      if (!balance) {
        return req.error(400, "No leave balance found for this leave type and year");
      }
      if (balance.remainingDays < days) {
        return req.error(400, `Only ${balance.remainingDays} days left, you asked for ${days}`);
      }

      // Check overlap with this employee's active requests
      const overlap = await SELECT.one.from(LeaveRequests).where({
        employee_ID,
        status: { in: ["Pending", "Approved"] },
        startDate: { "<=": endDate },
        endDate: { ">=": startDate },
      });

      if (overlap) {
        return req.error(400, "These dates overlap with an existing leave request");
      }
    });

    return super.init();
  }
}