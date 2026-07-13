const createMiniLeagueBtn =
  document.getElementById("createMiniLeagueBtn");

const miniLeagueMessage =
  document.getElementById("miniLeagueMessage");

const dreamLeaderboardContainer =
  document.getElementById("dreamLeaderboardContainer");

const seasonDreamLeaderboardTab =
  document.getElementById("seasonDreamLeaderboardTab");

const weeklyDreamLeaderboardTab =
  document.getElementById("weeklyDreamLeaderboardTab");


createMiniLeagueBtn.addEventListener("click", () => {
  miniLeagueMessage.textContent =
    "Mini leagues are coming soon!";
});


seasonDreamLeaderboardTab.addEventListener("click", () => {
  seasonDreamLeaderboardTab.classList.add("active");
  weeklyDreamLeaderboardTab.classList.remove("active");

  dreamLeaderboardContainer.innerHTML = `
    <p class="leaderboard-empty-message">
      The Dream Team season leaderboard is coming soon.
    </p>
  `;
});


weeklyDreamLeaderboardTab.addEventListener("click", () => {
  weeklyDreamLeaderboardTab.classList.add("active");
  seasonDreamLeaderboardTab.classList.remove("active");

  showWeeklyLeaderboardPlaceholder();
});


function showWeeklyLeaderboardPlaceholder() {
  dreamLeaderboardContainer.innerHTML = `
    <p class="leaderboard-empty-message">
      The weekly Dream Team leaderboard is being prepared.
    </p>
  `;
}


showWeeklyLeaderboardPlaceholder();