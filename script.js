// Storage helpers
const STORAGE_KEY = 'elitePlayers:v1:tournaments';

function loadTournaments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Failed to parse tournaments', e);
    return [];
  }
}

function saveTournaments(tournaments) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tournaments));
}

document.addEventListener('DOMContentLoaded', () => {
  // index.html: Load and display tournaments
  const tournamentList = document.getElementById('tournament-list');
  if (tournamentList) {
    const tournaments = loadTournaments().sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
    tournamentList.innerHTML = '';

    if (tournaments.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <p>No tournaments yet.</p>
        <a class="btn btn-primary" href="create.html">Create Tournament</a>
      `;
      tournamentList.appendChild(empty);
    } else {
      tournaments.forEach(tournament => {
        const card = document.createElement('article');
        card.className = 'tournament-card';

        const head = document.createElement('div');
        head.className = 'card-head';

        const title = document.createElement('h4');
        title.textContent = tournament.name;

        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = tournament.status;

        head.append(title, badge);

        const meta1 = document.createElement('p');
        meta1.className = 'meta';
        meta1.textContent = `Format: ${tournament.format}`;

        const meta2 = document.createElement('p');
        meta2.className = 'meta';
        meta2.textContent = `Teams: ${tournament.numberOfTeams}`;

        card.append(head, meta1, meta2);

        card.addEventListener('click', () => {
          window.location.href = `tournament.html?id=${tournament.id}`;
        });

        tournamentList.appendChild(card);
      });
    }
  }

  // create.html: Handle form submission
  const form = document.getElementById('tournament-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const format = document.getElementById('format').value;
      const numberOfTeams = parseInt(document.getElementById('numberOfTeams').value, 10);
      const status = document.getElementById('status').value;

      if (name.length < 3) {
        alert('Please enter a valid tournament name (3+ characters).');
        return;
      }

      const tournaments = loadTournaments();
      const newTournament = {
        id: Date.now(),
        createdAt: Date.now(),
        name,
        format,
        numberOfTeams,
        status
      };

      tournaments.push(newTournament);
      saveTournaments(tournaments);

      window.location.href = 'index.html';
    });
  }

  // tournament.html: Load and display tournament details
  const infoDiv = document.getElementById('tournament-info');
  if (infoDiv) {
    const urlParams = new URLSearchParams(window.location.search);
    const id = parseInt(urlParams.get('id'), 10);
    const tournaments = loadTournaments();
    const tournament = tournaments.find(t => t.id === id);

    infoDiv.innerHTML = '';

    if (tournament) {
      const title = document.createElement('h3');
      title.textContent = tournament.name;

      const p1 = document.createElement('p');
      p1.textContent = `Format: ${tournament.format}`;

      const p2 = document.createElement('p');
      p2.textContent = `Number of Teams: ${tournament.numberOfTeams}`;

      const p3 = document.createElement('p');
      p3.textContent = `Status: ${tournament.status}`;

      const hr = document.createElement('hr');

      const placeholder = document.createElement('p');
      if (tournament.format === 'Knockout') {
        placeholder.textContent = 'Knockout Bracket (coming soon...)';
      } else if (tournament.format === 'League (Home & Away)') {
        placeholder.textContent = 'League Table (coming soon...)';
      } else if (tournament.format === 'Group + Knockout') {
        placeholder.textContent = 'Group Stage and Knockout (coming soon...)';
      }

      infoDiv.append(title, p1, p2, p3, hr, placeholder);
    } else {
      infoDiv.innerHTML = '<p>Tournament not found.</p>';
    }
  }
});
