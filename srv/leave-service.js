import cds from "@sap/cds";

const { SELECT, UPDATE } = cds.ql;

export default class LeaveService extends cds.ApplicationService {
  init() {
    const { LeaveRequests, LeaveBalances } = this.entities;

    // Rules before a new leave request is saved
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

    // Approve a pending request and deduct the balance
    this.on("approve", LeaveRequests, async (req) => {
      const key = req.params[0];
      const ID = key.ID ?? key;

      const request = await SELECT.one.from(LeaveRequests).where({ ID });
      if (!request) {
        return req.error(404, "Leave request not found");
      }
      if (request.status !== "Pending") {
        return req.error(400, `Only Pending requests can be approved (current status: ${request.status})`);
      }

      await UPDATE(LeaveBalances)
        .set({ remainingDays: { "-=": request.days } })
        .where({
          employee_ID: request.employee_ID,
          leaveType_ID: request.leaveType_ID,
          year: new Date(request.startDate).getFullYear(),
        });

      await UPDATE(LeaveRequests).set({ status: "Approved" }).where({ ID });
    });

    // Reject a pending request (no balance change)
    this.on("reject", LeaveRequests, async (req) => {
      const key = req.params[0];
      const ID = key.ID ?? key;

      const request = await SELECT.one.from(LeaveRequests).where({ ID });
      if (!request) {
        return req.error(404, "Leave request not found");
      }
      if (request.status !== "Pending") {
        return req.error(400, `Only Pending requests can be rejected (current status: ${request.status})`);
      }

      await UPDATE(LeaveRequests).set({ status: "Rejected" }).where({ ID });
    });

    // Cancel a request (refund days if it was already approved)
    this.on("cancel", LeaveRequests, async (req) => {
      const key = req.params[0];
      const ID = key.ID ?? key;

      const request = await SELECT.one.from(LeaveRequests).where({ ID });
      if (!request) {
        return req.error(404, "Leave request not found");
      }
      if (!["Pending", "Approved"].includes(request.status)) {
        return req.error(400, `Cannot cancel a request that is ${request.status}`);
      }

      if (request.status === "Approved") {
        await UPDATE(LeaveBalances)
          .set({ remainingDays: { "+=": request.days } })
          .where({
            employee_ID: request.employee_ID,
            leaveType_ID: request.leaveType_ID,
            year: new Date(request.startDate).getFullYear(),
          });
      }

      await UPDATE(LeaveRequests).set({ status: "Cancelled" }).where({ ID });
    });

    // Tell the frontend who is logged in
    this.on("me", (req) => ({
      id: req.user.id,
      roles: ["Employee", "Manager", "HR"].filter((r) => req.user.is(r)),
      employee_ID: req.user.attr?.employee_ID,
    }));

    return super.init();
  }
}