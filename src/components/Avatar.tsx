interface AvatarProps {
  name: string;
  size?: number;
}

/** Initial-in-a-circle avatar in the brand colors. */
export function Avatar({ name, size = 48 }: AvatarProps) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.44 }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}
