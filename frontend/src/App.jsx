import { useState, useEffect } from "react";
import "./App.css";

const API = "/odata/v4/leave";

function App() {
  const [auth, setAuth] = useState(sessionStorage.getItem("auth") || "");
  const [me, setMe] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    leaveType_ID: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Every request carries the login in the Authorization header
  const call = (path, options = {}, token = auth) =>
    fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
        ...options.headers,
      },
    });

  const login = async () => {
    const token = "Basic " + btoa(`${loginForm.username}:${loginForm.password}`);
    const res = await call("/me()", {}, token);
    if (!res.ok) {
      setLoginError("Wrong username or password");
      return;
    }
    sessionStorage.setItem("auth", token);
    setLoginError("");
    setAuth(token);
  };

  const logout = () => {
    sessionStorage.removeItem("auth");
    setAuth("");
    setMe(null);
    setRequests([]);
    setBalances([]);
  };

  const loadAll = async () => {
    const m = await call("/me()");
    if (!m.ok) {
      logout();
      return;
    }
    setMe(await m.json());
    setRequests((await (await call("/LeaveRequests?$expand=employee,leaveType")).json()).value);
    setBalances((await (await call("/LeaveBalances?$expand=employee,leaveType")).json()).value);
    setLeaveTypes((await (await call("/LeaveTypes")).json()).value);
  };

  useEffect(() => {
    if (auth) loadAll();
  }, [auth]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const applyLeave = async () => {
    setError("");
    setSuccess("");
    const res = await call("/LeaveRequests", {
      method: "POST",
      body: JSON.stringify({ ...form, employee_ID: me.employee_ID }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Something went wrong");
      return;
    }
    setSuccess("Leave request submitted");
    setForm({ ...form, startDate: "", endDate: "", reason: "" });
    loadAll();
  };

  const doAction = async (id, action) => {
    setError("");
    setSuccess("");
    const res = await call(`/LeaveRequests(${id})/${action}`, {
      method: "POST",
      body: "{}",
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Something went wrong");
      return;
    }
    setSuccess(`Action "${action}" completed`);
    loadAll();
  };

  // ---------- Login screen ----------
  if (!auth) {
    return (
      <div className="container login">
        <h1>Leave Management</h1>
        <h2>Login</h2>
        <input
          placeholder="Username"
          value={loginForm.username}
          onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
        />
        <input
          type="password"
          placeholder="Password"
          value={loginForm.password}
          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && login()}
        />
        <button onClick={login}>Login</button>
        {loginError && <p className="error">{loginError}</p>}
      </div>
    );
  }

  if (!me) return <div className="container">Loading...</div>;

  const isApprover = me.roles.includes("Manager") || me.roles.includes("HR");
    const count = (status) => requests.filter((r) => r.status === status).length;
  const cards = ["Pending", "Approved", "Rejected", "Cancelled"];

  // ---------- Main screen ----------
  return (
    <div className="container">
      <div className="topbar">
        <h1>Leave Management</h1>
        <div>
          {me.id} ({me.roles.join(", ")}){" "}
          <button onClick={logout}>Logout</button>
        </div>
      </div>
      <div className="cards">
        {cards.map((s) => (
          <div key={s} className={`card ${s}`}>
            <div className="num">{count(s)}</div>
            <div>{s}</div>
          </div>
        ))}
      </div>
      <h2>Apply for leave</h2>
      <div className="form">
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
          <tr><th>Employee</th><th>Leave type</th><th>Year</th><th>Days left</th></tr>
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
            <th>Employee</th><th>Leave type</th><th>From</th><th>To</th>
            <th>Days</th><th>Status</th><th>Actions</th>
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
              <td><span className={`badge ${r.status}`}>{r.status}</span></td>
              <td>
                {isApprover && r.status === "Pending" && (
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