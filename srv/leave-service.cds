using leave from '../db/schema';

service LeaveService @(requires: 'authenticated-user') {

  @restrict: [
    { grant: 'READ', to: 'authenticated-user' },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: 'HR' }
  ]
  entity Employees as projection on leave.Employees;

  @restrict: [
    { grant: 'READ', to: 'authenticated-user' },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: 'HR' }
  ]
  entity LeaveTypes as projection on leave.LeaveTypes;

  @restrict: [
    { grant: 'READ', to: 'Employee', where: 'employee_ID = $user.employee_ID' },
    { grant: 'READ', to: ['Manager', 'HR'] }
  ]
  entity LeaveBalances as projection on leave.LeaveBalances;

  @restrict: [
    { grant: 'READ', to: 'Employee', where: 'employee_ID = $user.employee_ID' },
    { grant: 'READ', to: ['Manager', 'HR'] },
    { grant: 'CREATE', to: 'Employee' },
    { grant: ['approve', 'reject'], to: ['Manager', 'HR'] },
    { grant: 'cancel', to: 'Employee' }
  ]
  entity LeaveRequests as projection on leave.LeaveRequests actions {
    action approve();
    action reject();
    action cancel();
  };
    function me() returns { id : String; roles : many String; employee_ID : String };
}