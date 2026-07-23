// MS Teams provisioning status for one course — renders nothing unless the
// msteams plugin is installed and has a row for this course. Live-updates
// over Ably (course:{id} / msteams.status); the fetch is the source of
// truth, realtime is the accelerant.
import { useEffect, useState } from "react";
import { apiGet } from "../api";
import { subscribeCourse } from "../lib/realtime";
import Badge from "./common/Badge";

const STATUS_VARIANT = {
  pending: "amber",
  ready: "green",
  failed: "red",
  archived: "grey",
};

export default function TeamsChip({ courseId }) {
  const [team, setTeam] = useState(null);

  useEffect(() => {
    setTeam(null);
    if (!courseId) return undefined;
    let alive = true;
    apiGet(`/api/plugins/msteams/status?course_id=${courseId}`)
      .then((res) => {
        if (alive && res.installed && res.teams.length) setTeam(res.teams[0]);
      })
      .catch(() => {}); // chip is decoration — never blocks the page
    const unsubscribe = subscribeCourse(courseId, ({ name, data }) => {
      if (name === "msteams.status" && alive)
        setTeam((cur) => ({ ...(cur ?? { course_id: courseId }), ...data }));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [courseId]);

  if (!team) return null;
  return (
    <Badge
      variant={STATUS_VARIANT[team.status] ?? "neutral"}
      title={
        team.error
          ? `MS Teams: ${team.status} — ${team.error}`
          : `MS Teams team ${team.status}`
      }
    >
      Teams: {team.status}
    </Badge>
  );
}
