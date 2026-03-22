import "./style.css";
import { games, leaderboard, payments, players } from "./data";
import type { Game, GameStatus } from "./types";

const sections = ["overview", "games", "players", "payments", "stats"] as const;
type Section = (typeof sections)[number];

const statusLabel: Record<GameStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  complete: "Complete"
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("App root not found");
}

let activeSection: Section = "overview";

const render = () => {
  app.innerHTML = `
    <main>
      <header>
        <h1>One Love Football</h1>
        <p>Community hub for match tracking, game sheets, payments, and leaderboard stats. This is the base we will extend with Supabase, authentication, and real-time updates.</p>
        <nav>
          ${sections
            .map(
              (section) =>
                `<button data-section="${section}" class="${activeSection === section ? "active" : ""}">${
                  section[0].toUpperCase() + section.slice(1)
                }</button>`
            )
            .join("")}
        </nav>
      </header>

      ${renderSection(activeSection)}
    </main>
  `;

  app.querySelectorAll<HTMLButtonElement>("button[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.section as Section;
      if (section !== activeSection) {
        activeSection = section;
        render();
      }
    });
  });
};

const renderSection = (section: Section) => {
  switch (section) {
    case "games":
      return renderGames();
    case "players":
      return renderPlayers();
    case "payments":
      return renderPayments();
    case "stats":
      return renderStats();
    default:
      return renderOverview();
  }
};

const renderOverview = () => {
  const upcoming = games.filter((game) => game.status !== "complete");
  const paidCount = payments.filter((payment) => payment.status === "paid").length;
  return `
    <section class="section">
      <div class="grid-two">
        <article class="card">
          <h3>Next Fixtures</h3>
          ${upcoming
            .map(
              (game) =>
                `<div class="subtle">${game.date} • ${game.opponent} • ${game.location}</div>`
            )
            .join("")}
        </article>
        <article class="card">
          <h3>Collection Snapshot</h3>
          <div class="badge highlight">${paidCount} collected</div>
          <div class="subtle">${payments.length - paidCount} still due</div>
        </article>
      </div>
      <article class="card">
        <h3>Leaderboard Spotlight</h3>
        ${renderLeaderboardTable()}
      </article>
    </section>
  `;
};

const renderGames = () => {
  return `
    <section class="section">
      <article class="card">
        <h3>Match Calendar</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Opponent</th>
              <th>Location</th>
              <th>Status</th>
              <th>Roster</th>
            </tr>
          </thead>
          <tbody>
            ${games
              .map(
                (game) => `
                  <tr>
                    <td>${game.date}</td>
                    <td>${game.opponent}</td>
                    <td>${game.location}</td>
                    <td>${statusLabel[game.status]}</td>
                    <td>${game.rosterCount}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </article>
      <article class="card">
        <h3>Game Sheet Builder (Stub)</h3>
        <p class="subtle">We will plug Supabase here to create, update, and finalize a game sheet before match day.</p>
      </article>
    </section>
  `;
};

const renderPlayers = () => {
  return `
    <section class="section">
      <article class="card">
        <h3>Roster</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Position</th>
              <th>Jersey</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            ${players
              .map(
                (player) => `
                <tr>
                  <td>${player.name}</td>
                  <td>${player.position}</td>
                  <td>#${player.jersey}</td>
                  <td>${player.attendanceRate}%</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </article>
    </section>
  `;
};

const renderPayments = () => {
  return `
    <section class="section">
      <article class="card">
        <h3>Dues & Collections</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            ${payments
              .map((payment) => {
                const player = players.find((entry) => entry.id === payment.playerId);
                return `
                <tr>
                  <td>${player?.name ?? "Unknown"}</td>
                  <td>$${payment.amount}</td>
                  <td>${payment.status === "paid" ? "Collected" : "Due"}</td>
                  <td>${payment.note ?? "-"}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </article>
    </section>
  `;
};

const renderStats = () => {
  return `
    <section class="section">
      <article class="card">
        <h3>Performance Metrics</h3>
        ${renderLeaderboardTable()}
      </article>
      <article class="card">
        <h3>Insights (Stub)</h3>
        <p class="subtle">Future: add charts for goals, assists, clean sheets, and win rate trends.</p>
      </article>
    </section>
  `;
};

const renderLeaderboardTable = () => {
  return `
    <table class="table">
      <thead>
        <tr>
          <th>Player</th>
          <th>Goals</th>
          <th>Assists</th>
          <th>Player of Match</th>
        </tr>
      </thead>
      <tbody>
        ${leaderboard
          .map((entry) => {
            const player = players.find((item) => item.id === entry.playerId);
            return `
            <tr>
              <td>${player?.name ?? "Unknown"}</td>
              <td>${entry.goals}</td>
              <td>${entry.assists}</td>
              <td>${entry.motm}</td>
            </tr>
          `;
          })
          .join("")}
      </tbody>
    </table>
  `;
};

render();
