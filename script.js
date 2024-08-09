document.addEventListener("DOMContentLoaded", function () {
  const API_KEY = "0d82e737454a4b08d81d25dc82e235f2";
  let API_URL = `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=en-US&page=1`;
  const MOVIE_DETAILS_URL = `https://api.themoviedb.org/3/movie/{movie_id}?api_key=${API_KEY}&language=en-US`;
  const MOVIE_VIDEO_URL = `https://api.themoviedb.org/3/movie/{movie_id}/videos?api_key=${API_KEY}&language=en-US`;

  const movieContainer = document.getElementById("movie-container");
  const loadMoreContainer = document.getElementById("load-more-container");
  const playButton = document.getElementById("play-btn");
  let currentPage = 1;
  let currentMovieId;
  let allMovies = []; // Store all fetched movies

  // Fetch movies from API
  async function fetchMovies() {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      allMovies = [...allMovies, ...data.results]; // Store movies for filtering
      displayMovies(data.results);
    } catch (error) {
      console.error("Error fetching movies:", error);
      displayError("Failed to fetch movies. Please try again later.");
    }
  }

  // Display movies in the container with lazy-loaded images
  function displayMovies(movies) {
    movieContainer.innerHTML = ""; // Clear the container before displaying new movies
    movies.forEach((movie) => {
      const movieCard = document.createElement("div");
      movieCard.classList.add("movie-card");
      movieCard.setAttribute("tabindex", "0");
      movieCard.setAttribute("role", "button");
      movieCard.setAttribute("aria-label", `Details for ${movie.title}`);
      movieCard.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}" loading="lazy" onerror="this.src='default-poster.jpg';">
        <h3>${movie.title}</h3>
        <p>Release Date: ${movie.release_date}</p>
      `;
      movieCard.addEventListener("click", () => showMovieDetails(movie.id));
      movieCard.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          showMovieDetails(movie.id);
        }
      });
      movieContainer.appendChild(movieCard);
    });

    // Ensure the "More Movies" button is visible
    loadMoreContainer.style.display = "block";
  }

  // Show movie details
  async function showMovieDetails(movieId) {
    try {
      const response = await fetch(
        MOVIE_DETAILS_URL.replace("{movie_id}", movieId)
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      displayMovieDetails(data);
      currentMovieId = movieId;
      playButton.style.display = "block"; // Show the play button
      playButton.onclick = playMovie; // Assign the playMovie function only once
    } catch (error) {
      console.error("Error fetching movie details:", error);
      displayError("Failed to fetch movie details. Please try again later.");
    }
  }

  // Display movie details in the container
  function displayMovieDetails(movie) {
    const genres = movie.genres.map((genre) => genre.name).join(", ");
    movieContainer.innerHTML = `
      <div class="movie-details">
        <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}" loading="lazy" onerror="this.src='default-poster.jpg';">
        <div class="movie-info">
          <h3>${movie.title}</h3>
          <p>Release Date: ${movie.release_date}</p>
          <p>Duration: ${movie.runtime} minutes</p>
          <p>Genre: ${genres}</p>
          <p>Summary: ${movie.overview}</p>
          <button id="back-btn" aria-label="Back to Movies">Back to Movies</button>
        </div>
      </div>
    `;

    // Hide the "More Movies" button when viewing movie details
    loadMoreContainer.style.display = "none";

    document.getElementById("back-btn").addEventListener("click", () => {
      displayMovies(allMovies);
      playButton.style.display = "none"; // Hide the play button
    });
  }

  // Play the movie trailer
  async function playMovie() {
    try {
      const response = await fetch(
        MOVIE_VIDEO_URL.replace("{movie_id}", currentMovieId)
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Check if there are any videos returned, and if so, get the first one
      if (data.results.length === 0) {
        displayError("No video found for this movie.");
        return;
      }

      // Get the first video (usually the trailer)
      const video = data.results.find((video) => video.site === "YouTube");
      if (!video) {
        displayError("No YouTube video found for this movie.");
        return;
      }

      const videoUrl = `https://www.youtube.com/embed/${video.key}?autoplay=1`;
      const iframe = document.createElement("iframe");
      iframe.src = videoUrl;
      iframe.setAttribute("frameborder", "0");
      iframe.allowFullscreen = true;
      iframe.setAttribute("aria-label", "Movie trailer");
      iframe.style.width = "100%";
      iframe.style.height = "500px";
      movieContainer.innerHTML = "";
      movieContainer.appendChild(iframe);

      // Add an event listener for iframe errors
      iframe.onerror = function () {
        displayError("Failed to load the video. Please try again later.");
      };
    } catch (error) {
      console.error("Error playing movie:", error);
      displayError("Failed to play movie. Please try again later.");
    }
  }

  // Load more movies when the button is clicked (throttled to avoid excessive API calls)
  function loadMoreMovies() {
    currentPage++;
    API_URL = `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=en-US&page=${currentPage}`;
    fetchMovies();
  }

  // Display error messages
  function displayError(message) {
    const errorElement = document.createElement("div");
    errorElement.textContent = message;
    errorElement.classList.add("error");
    movieContainer.innerHTML = "";
    movieContainer.appendChild(errorElement);
  }

  // Initialize fetching movies
  fetchMovies();

  // Set up the more button
  const loadMoreButton = document.createElement("button");
  loadMoreButton.textContent = "More Movies";
  loadMoreButton.addEventListener("click", loadMoreMovies);
  loadMoreContainer.appendChild(loadMoreButton);

  // Filtering functionality
  const filterBtns = document.querySelectorAll(".filter-btn");

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const filterValue = e.target.textContent.toLowerCase();
      if (filterValue === "reset filter") {
        displayMovies(allMovies);
      } else {
        const filteredMovies = allMovies.filter((movie) => {
          const movieGenres = movie.genre_ids
            .map((id) => genreIdToName(id))
            .join(", ")
            .toLowerCase();
          return (
            movie.title.toLowerCase().includes(filterValue) ||
            movieGenres.includes(filterValue)
          );
        });
        displayMovies(filteredMovies);
      }
    });
  });

  function genreIdToName(id) {
    // Map TMDb genre IDs to genre names
    const genres = {
      28: "Action",
      12: "Adventure",
      16: "Animation",
      35: "Comedy",
      80: "Crime",
      99: "Documentary",
      18: "Drama",
      10751: "Family",
      14: "Fantasy",
      36: "History",
      27: "Horror",
      10402: "Music",
      9648: "Mystery",
      10749: "Romance",
      878: "Science Fiction",
      10770: "TV Movie",
      53: "Thriller",
      10752: "War",
      37: "Western",
    };
    return genres[id] || "Unknown";
  }
});

// const watchLaterBtn = document.getElementById("watch-later-btn");

const sidebar = document.getElementById("sidebar");
const hamburger = document.getElementById("hamburger");

hamburger.addEventListener("click", () => {
  sidebar.classList.toggle("active");
});
