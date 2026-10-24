import { useState, useEffect } from "react";
import "./App.css";

const API = "/odata/v4/leave";

function App() {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    employee_ID: "",
    leaveType_ID: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const loadRequests = async () => {
    const res = await fetch(`${API}/LeaveRequests?$expand=employee,leaveType`);
    const data = await res.json();
    setRequests(data.value);
  };

  const loadBalances = async () => {
    const res = await fetch(`${API}/LeaveBalances?$expand=employee,leaveType`);
    const data = await res.json();
    setBalances(data.value);
  };

  const loadLookups = async () => {
    const e = await (await fetch(`${API}/Employees`)).json();
    const t = await (await fetch(`${API}/LeaveTypes`)).json();
    setEmployees(e.value);
    setLeaveTypes(t.value);
  };

  useEffect(() => {
    loadRequests();
    loadLookups();
    loadBalances();
  }, []);

  // Update one form field
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const applyLeave = async () => {
    setError("");
    setSuccess("");

    const res = await fetch(`${API}/LeaveRequests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Something went wrong");
      return;
    }

    setSuccess("Leave request submitted");
    setForm({ ...form, startDate: "", endDate: "", reason: "" });
    loadRequests();
    loadBalances();
  };

  // Call approve / reject / cancel on one request
  const doAction = async (id, action) => {
    setError("");
    setSuccess("");

    const res = await fetch(`${API}/LeaveRequests(${id})/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Something went wrong");
      return;
    }

    setSuccess(`Action "${action}" completed`);
    loadRequests();
    loadBalances();
  };

  return (
    <div className="container">
      <h1>Leave Management</h1>

      <h2>Apply for leave</h2>
      <div className="form">
        <select name="employee_ID" value={form.employee_ID} onChange={handleChange}>
          <option value="">Select employee</option>
          {employees.map((e) => (
            <option key={e.ID} value={e.ID}>{e.name}</option>
          ))}
        </select>

        <select name="leaveType_ID" value={form.leaveType_ID} onChange={handleChange}>
          <option value="">Select leave type</option>
          {leaveTypes.map((t) => (
            <option key={t.ID} value={t.ID}>{t.name}</option>
          ))}
        </select>

        <input type="date" name="startDate" value={form.startDate} onChange={handleChange} />
        <input type="date" name="endDate" value={form.endDate} onChange={handleChange} />
        <input name="reason" placeholder="Reason" value={form.reason} onChange={handleChange} />
        <button onClick={applyLeave}>Apply</button>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <h2>Leave balance</h2>
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Leave type</th>
            <th>Year</th>
            <th>Days left</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((b) => (
            <tr key={b.ID}>
              <td>{b.employee?.name}</td>
              <td>{b.leaveType?.name}</td>
              <td>{b.year}</td>
              <td>{b.remainingDays}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Leave requests</h2>
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Leave type</th>
            <th>From</th>
            <th>To</th>
            <th>Days</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.ID}>
              <td>{r.employee?.name}</td>
              <td>{r.leaveType?.name}</td>
              <td>{r.startDate}</td>
              <td>{r.endDate}</td>
              <td>{r.days}</td>
              <td>
                <span className={`badge ${r.status}`}>{r.status}</span>
              </td>
              <td>
                {r.status === "Pending" && (
                  <>
                    <button onClick={() => doAction(r.ID, "approve")}>Approve</button>{" "}
                    <button onClick={() => doAction(r.ID, "reject")}>Reject</button>{" "}
                  </>
                )}
                {(r.status === "Pending" || r.status === "Approved") && (
                  <button onClick={() => doAction(r.ID, "cancel")}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;