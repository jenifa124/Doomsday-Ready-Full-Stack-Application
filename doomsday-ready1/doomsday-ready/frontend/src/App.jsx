import React, { useEffect, useState } from 'react';
import {
  Film,
  Clapperboard,
  Ticket,
  Plus,
  CheckCircle2,
  Clock3,
  RefreshCw,
} from 'lucide-react';

const api = async (path, options = {}) => {
  const response = await fetch('/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${data.error || 'ERROR'}: ${data.message || response.statusText}`);
  }
  return data;
};

export default function App() {
  const [tab, setTab] = useState('movies');
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [movieForm, setMovieForm] = useState({
    title: '',
    releaseYear: 2019,
    runtime: 120,
    prerequisites: [],
  });
  const [cinemaForm, setCinemaForm] = useState({ name: '', bundleSizes: '2,5' });
  const [target, setTarget] = useState('');
  const [plan, setPlan] = useState(null);
  const [cinemaId, setCinemaId] = useState('');
  const [groupSize, setGroupSize] = useState(6);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [m, c] = await Promise.all([api('/movies'), api('/cinemas')]);
      setMovies(m);
      setCinemas(c);
      setError('');
    } catch (e) {
      setError(
        e.message.includes('Failed to fetch') || e.message.includes('NetworkError')
          ? 'Cannot reach the API. Make sure the backend is running on port 5000 (npm start inside backend/).'
          : e.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const action = async (fn) => {
    setError('');
    setMessage('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const createMovie = (e) => {
    e.preventDefault();
    action(async () => {
      await api('/movies', {
        method: 'POST',
        body: JSON.stringify({
          ...movieForm,
          releaseYear: Number(movieForm.releaseYear),
          runtime: Number(movieForm.runtime),
        }),
      });
      setMovieForm({ title: '', releaseYear: 2019, runtime: 120, prerequisites: [] });
      setMessage('Movie added!');
    });
  };

  const createCinema = (e) => {
    e.preventDefault();
    action(async () => {
      await api('/cinemas', {
        method: 'POST',
        body: JSON.stringify({
          name: cinemaForm.name,
          bundleSizes: cinemaForm.bundleSizes
            .split(',')
            .map((x) => Number(x.trim()))
            .filter((n) => !Number.isNaN(n)),
        }),
      });
      setCinemaForm({ name: '', bundleSizes: '2,5' });
      setMessage('Cinema added!');
    });
  };

  const patchMovie = (id, changes) =>
    action(async () => {
      await api(`/movies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      setPlan(null);
      setMessage('Movie updated!');
    });

  const showPlan = () =>
    action(async () => {
      setPlan(await api(`/movies/${target}/rewatch-order`));
    });

  const showQuote = () =>
    action(async () => {
      setQuote(await api(`/cinemas/${cinemaId}/booking?groupSize=${groupSize}`));
    });

  const movieName = (id) => movies.find((m) => m.id === id)?.title || `#${id}`;

  return (
    <div className="shell">
      <header>
        <div className="brand">
          <span className="brand-icon">✦</span>
          <div>
            <strong>
              DOOMSDAY <em>READY</em>
            </strong>
            <small>THE ULTIMATE MCU REWATCH PLANNER</small>
          </div>
        </div>
        <span className="edition">FAN EDITION • 2027</span>
      </header>

      <main>
        <div className="hero">
          <span className="eyebrow">THE COUNTDOWN STARTS NOW</span>
          <h1>
            Every hero. Every story.
            <br />
            <span>One epic night.</span>
          </h1>
          <p>
            Plan your Marvel marathon, track your progress, and find the perfect cinema
            bundle for your crew.
          </p>
        </div>

        <nav>
          {[
            ['movies', Film, 'Movies'],
            ['rewatch', Clapperboard, 'Rewatch Plan'],
            ['booking', Ticket, 'Watch Party Booking'],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              className={tab === key ? 'active' : ''}
              onClick={() => {
                setTab(key);
                setError('');
                setMessage('');
              }}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}
        {loading && !error && <div className="alert">Loading…</div>}

        {tab === 'movies' && (
          <div className="columns">
            <section className="panel">
              <h2>
                <Plus size={21} /> Add a movie
              </h2>
              <p className="hint">Build your own MCU watchlist.</p>
              <form onSubmit={createMovie}>
                <label>
                  Movie title
                  <input
                    required
                    placeholder="e.g. Avengers: Endgame"
                    value={movieForm.title}
                    onChange={(e) =>
                      setMovieForm({ ...movieForm, title: e.target.value })
                    }
                  />
                </label>
                <div className="two">
                  <label>
                    Release year
                    <input
                      type="number"
                      min="1"
                      max="9999"
                      required
                      value={movieForm.releaseYear}
                      onChange={(e) =>
                        setMovieForm({ ...movieForm, releaseYear: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Runtime (minutes)
                    <input
                      type="number"
                      min="1"
                      max="300"
                      required
                      value={movieForm.runtime}
                      onChange={(e) =>
                        setMovieForm({ ...movieForm, runtime: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label>
                  Prerequisites (Ctrl-click to select multiple)
                  <select
                    multiple
                    value={movieForm.prerequisites.map(String)}
                    onChange={(e) =>
                      setMovieForm({
                        ...movieForm,
                        prerequisites: [...e.target.selectedOptions].map((x) =>
                          Number(x.value)
                        ),
                      })
                    }
                  >
                    {movies.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary" type="submit">
                  + Add Movie
                </button>
              </form>
            </section>

            <section className="panel">
              <h2>
                <Film size={21} /> Your movies{' '}
                <span className="count">{movies.length}</span>
              </h2>
              <p className="hint">Mark watched or edit dependencies below.</p>
              {movies.length === 0 ? (
                <p className="empty">No movies yet. Add your first movie!</p>
              ) : (
                <div className="movie-list">
                  {movies.map((m) => (
                    <article className="movie" key={m.id}>
                      <div className="movie-heading">
                        <div>
                          <h3>{m.title}</h3>
                          <small>
                            {m.releaseYear} • {m.runtime} min
                          </small>
                        </div>
                        <label className="watched">
                          <input
                            type="checkbox"
                            checked={m.watched}
                            onChange={(e) =>
                              patchMovie(m.id, { watched: e.target.checked })
                            }
                          />{' '}
                          Watched
                        </label>
                      </div>
                      <label className="sub-label">
                        Watch these first
                        <select
                          multiple
                          value={m.prerequisites.map(String)}
                          onChange={(e) =>
                            patchMovie(m.id, {
                              prerequisites: [...e.target.selectedOptions].map((x) =>
                                Number(x.value)
                              ),
                            })
                          }
                        >
                          {movies
                            .filter((x) => x.id !== m.id)
                            .map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.title}
                              </option>
                            ))}
                        </select>
                      </label>
                      <small className="muted">
                        Current: {m.prerequisites.map(movieName).join(', ') || 'None'}
                      </small>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'rewatch' && (
          <section className="panel wide">
            <h2>
              <Clapperboard size={22} /> Your rewatch mission
            </h2>
            <p className="hint">
              Choose the final movie and we'll map out every prerequisite in order.
            </p>
            <div className="controls">
              <select
                value={target}
                onChange={(e) => {
                  setTarget(e.target.value);
                  setPlan(null);
                }}
              >
                <option value="">Select a target movie</option>
                {movies.map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
              <button className="primary" disabled={!target} onClick={showPlan}>
                Generate Plan
              </button>
            </div>
            {plan && (
              <>
                <div className="stats">
                  <div>
                    <small>MOVIES TO WATCH</small>
                    <strong>{plan.total}</strong>
                  </div>
                  <div>
                    <small>COMPLETED</small>
                    <strong>
                      {plan.watchedCount} / {plan.total}
                    </strong>
                  </div>
                  <div>
                    <small>TIME REMAINING</small>
                    <strong>
                      {Math.floor(plan.remainingMinutes / 60)}h{' '}
                      {plan.remainingMinutes % 60}m
                    </strong>
                  </div>
                </div>
                <div className="progress-title">
                  Your progress{' '}
                  <b>
                    {plan.total
                      ? Math.round((plan.watchedCount / plan.total) * 100)
                      : 100}
                    %
                  </b>
                </div>
                <div className="progress">
                  <div
                    style={{
                      width: `${
                        plan.total ? (plan.watchedCount / plan.total) * 100 : 100
                      }%`,
                    }}
                  />
                </div>
                {plan.movies.length === 0 ? (
                  <p className="empty">This movie has no prerequisites. You're ready!</p>
                ) : (
                  <ol className="plan-list">
                    {plan.movies.map((m) => (
                      <li key={m.id}>
                        <span>
                          {m.title}
                          <small>{m.runtime} min</small>
                        </span>
                        <span className={m.watched ? 'done' : 'pending'}>
                          {m.watched ? '✓ Watched' : 'Not watched'}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </section>
        )}

        {tab === 'booking' && (
          <div className="columns">
            <section className="panel">
              <h2>
                <Ticket size={21} /> Add a cinema
              </h2>
              <p className="hint">Set the seat bundle sizes sold by this cinema.</p>
              <form onSubmit={createCinema}>
                <label>
                  Cinema name
                  <input
                    required
                    value={cinemaForm.name}
                    placeholder="e.g. Stark Cinema"
                    onChange={(e) =>
                      setCinemaForm({ ...cinemaForm, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Bundle sizes (comma-separated)
                  <input
                    required
                    value={cinemaForm.bundleSizes}
                    onChange={(e) =>
                      setCinemaForm({ ...cinemaForm, bundleSizes: e.target.value })
                    }
                  />
                </label>
                <button className="primary">+ Add Cinema</button>
              </form>
              <p className="hint">{cinemas.length} cinema(s) available</p>
            </section>

            <section className="panel">
              <h2>
                <Ticket size={21} /> Get your booking quote
              </h2>
              <p className="hint">Exact seats. Fewest bundles. No empty seats.</p>
              <label>
                Choose cinema
                <select
                  value={cinemaId}
                  onChange={(e) => {
                    setCinemaId(e.target.value);
                    setQuote(null);
                  }}
                >
                  <option value="">Select cinema</option>
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.bundleSizes.join(', ')})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Group size
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={groupSize}
                  onChange={(e) => {
                    setGroupSize(e.target.value);
                    setQuote(null);
                  }}
                />
              </label>
              <button
                className="primary"
                disabled={!cinemaId || !groupSize}
                onClick={showQuote}
              >
                Calculate Minimum Bundles
              </button>
              {quote && (
                <div className="result">
                  {quote.possible ? (
                    <>
                      <h3>
                        <CheckCircle2 size={20} /> {quote.totalBundles} bundles needed
                      </h3>
                      {quote.bundles.map((b) => (
                        <div className="bundle" key={b.size}>
                          <span>{b.size}-seat bundle</span>
                          <strong>× {b.quantity}</strong>
                        </div>
                      ))}
                      <p className="hint">
                        Exactly {quote.groupSize} seats, zero extra seats.
                      </p>
                    </>
                  ) : (
                    <h3>Not possible — no exact bundle combination.</h3>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer>
        DOOMSDAY READY • Built for the Blinto Talent Accelerator assessment
      </footer>
    </div>
  );
}
