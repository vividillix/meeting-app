import { avatarColor, avatarInitial } from "../utils/avatar";

export default function Avatar({ name, size, color }) {
  return (
    <span
      className={`avatar ${size === "lg" ? "avatar--lg" : ""}`}
      style={{ background: color ?? avatarColor(name) }}
      aria-hidden="true"
    >
      {avatarInitial(name)}
    </span>
  );
}
