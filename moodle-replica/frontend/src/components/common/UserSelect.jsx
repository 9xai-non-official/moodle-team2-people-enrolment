// User dropdown fed by /api/users. value = user id (number) or "".
import { useEffect, useState } from "react";
import { apiGet } from "../../api";

export default function UserSelect({ value, onChange, placeholder = "— user —" }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/api/users")
      .then(setUsers)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <span className="inline-error">users: {error}</span>;
  return (
    <select
      className="select"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{placeholder}</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.full_name} ({u.username})
        </option>
      ))}
    </select>
  );
}
