import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { HISTORY_KEY } from './lib/storage';

beforeEach(() => localStorage.clear());

describe('App', () => {
  it('shows the empty state until both inputs are filled', () => {
    render(<App />);
    expect(screen.getByText(/Paste your resume and a job description above/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your resume'), { target: { value: 'Python developer' } });
    expect(screen.queryByTestId('score')).not.toBeInTheDocument();
  });

  it('scores the sample and saves it to history', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Try a sample' }));
    const score = Number(screen.getByTestId('score').textContent);
    expect(score).toBeGreaterThan(0);
    expect(screen.getByText('Suggestions')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save to history' }));
    expect(screen.getByRole('button', { name: 'Saved to history' })).toBeDisabled();
    const history = screen.getByRole('region', { name: 'History' });
    expect(within(history).getByText(/Brightpath Labs \(sample\)/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)).toHaveLength(1);
  });

  it('updates the score live as the resume changes', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Job description'), {
      target: { value: 'Requirements\n- Python\n- SQL\n- Docker' },
    });
    fireEvent.change(screen.getByLabelText('Your resume'), { target: { value: 'Python' } });
    const first = Number(screen.getByTestId('score').textContent);
    fireEvent.change(screen.getByLabelText('Your resume'), { target: { value: 'Python, SQL and Docker' } });
    const second = Number(screen.getByTestId('score').textContent);
    expect(second).toBeGreaterThan(first);
  });

  it('restores the draft from a previous visit', () => {
    localStorage.setItem('smartscore.draft.v1', JSON.stringify({ resume: 'Saved resume', job: 'Saved job', title: 'T' }));
    render(<App />);
    expect(screen.getByLabelText('Your resume')).toHaveValue('Saved resume');
    expect(screen.getByLabelText('Job description')).toHaveValue('Saved job');
  });
});
