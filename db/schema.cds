namespace leave;

using { cuid, managed } from '@sap/cds/common';

entity Employees : cuid, managed {
  name    : String(100);
  email   : String(100);
  role    : String(20);   // Employee, Manager, HR
  manager : Association to Employees;
}

entity LeaveTypes : cuid {
  name           : String(50);   // Annual, Sick, Casual
  maxDaysPerYear : Integer;
}

entity LeaveBalances : cuid {
  employee      : Association to Employees;
  leaveType     : Association to LeaveTypes;
  year          : Integer;
  remainingDays : Integer;
}

entity LeaveRequests : cuid, managed {
  employee  : Association to Employees;
  leaveType : Association to LeaveTypes;
  startDate : Date;
  endDate   : Date;
  days      : Integer;
  reason    : String(255);
  status    : String(20) default 'Pending';  // Pending, Approved, Rejected, Cancelled
}