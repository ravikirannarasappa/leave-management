using leave from '../db/schema';

service LeaveService {
  entity Employees      as projection on leave.Employees;
  entity LeaveTypes     as projection on leave.LeaveTypes;
  entity LeaveBalances  as projection on leave.LeaveBalances;
    entity LeaveRequests  as projection on leave.LeaveRequests actions {
    action approve();
    action reject();
    action cancel();
  };
}