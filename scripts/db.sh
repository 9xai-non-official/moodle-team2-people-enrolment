#!/usr/bin/env bash
# Query the local Moodle DB without retyping connection details.
# Credentials are read from Moodle's config.php at runtime — nothing secret is stored here.
#
#   ./scripts/db.sh "SELECT * FROM mdl_user_enrolments"     one-off query, table output
#   ./scripts/db.sh                                          interactive shell
#   ./scripts/db.sh -f queries/enrolment.sql                 run a file
#
# Instance: Moodle 5.3dev (alpha) via Moodle4Mac / MAMP.  Table prefix: mdl_
set -euo pipefail

MOODLE=${MOODLE_DIR:-/Applications/MAMP/htdocs2/moodle503}
CLIENT=${MYSQL_CLIENT:-/Applications/MAMP/Library/bin/mysql80/bin/mysql}
PORT=${DB_PORT:-8889}

[ -f "$MOODLE/config.php" ] || { echo "no config.php at $MOODLE — is MAMP installed there?" >&2; exit 1; }
[ -x "$CLIENT" ] || { echo "mysql client not found at $CLIENT" >&2; exit 1; }

cfg() { awk -F"'" "/\\\$CFG->$1/{print \$2; exit}" "$MOODLE/config.php"; }

DBUSER=$(cfg dbuser)
DBNAME=$(cfg dbname)
MYSQL_PWD=$(cfg dbpass); export MYSQL_PWD

if [ $# -eq 0 ]; then
  exec "$CLIENT" -u"$DBUSER" -h 127.0.0.1 -P "$PORT" -D "$DBNAME"
elif [ "$1" = "-f" ]; then
  exec "$CLIENT" -u"$DBUSER" -h 127.0.0.1 -P "$PORT" -D "$DBNAME" --table < "$2"
else
  exec "$CLIENT" -u"$DBUSER" -h 127.0.0.1 -P "$PORT" -D "$DBNAME" --table -e "$*"
fi
