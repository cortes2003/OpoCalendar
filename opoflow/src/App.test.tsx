import { render, screen, fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OpoCalendarApp from './App';
import { api } from './api';

// Mocks
vi.mock('./api', () => ({
  api: {
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    calculateOptimization: vi.fn(),
    applyOptimization: vi.fn(),
  },
}));

const MOCK_DATE = new Date('2025-11-20T12:00:00');
vi.setSystemTime(MOCK_DATE);

describe('OpoCalendar Frontend Tests', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getTasks as any).mockResolvedValue([]);
  });

  const waitForLoading = async () => {
    const loader = screen.queryByText(/Cargando/i);
    if (loader) await waitForElementToBeRemoved(loader);
  };

  it('renderiza la pantalla principal correctamente', async () => {
    render(<OpoCalendarApp />);
    await waitForLoading();
    
    expect(screen.getByText(/OpoCalendar/i)).toBeInTheDocument();
    expect(screen.getByText(/Horario Disponible/i)).toBeInTheDocument();
  });

  it('abre el modal de crear actividad al hacer clic en Nueva', async () => {
    render(<OpoCalendarApp />);
    await waitForLoading();
    
    const newButtons = screen.getAllByText(/Nueva/i);
    fireEvent.click(newButtons[0]);

    expect(screen.getByText('Nueva')).toBeInTheDocument();
    expect(screen.getByText('Guardar')).toBeInTheDocument();
  });

  it('valida que la hora fin no sea anterior a la de inicio', async () => {
    render(<OpoCalendarApp />);
    await waitForLoading();
    
    const newButtons = screen.getAllByText(/Nueva/i);
    fireEvent.click(newButtons[0]);

    // Usar selectores más genéricos o data-testid sería mejor, pero esto sirve
    // Asumimos que los inputs time están ordenados en el DOM
    const timeInputs = screen.container.querySelectorAll('input[type="time"]');
    // timeInputs[0] es start_time, [1] es end_time
    
    fireEvent.change(timeInputs[0], { target: { value: '10:00' } });
    fireEvent.change(timeInputs[1], { target: { value: '09:00' } });

    fireEvent.click(screen.getByText('Guardar'));

    expect(await screen.findByText('Error horario')).toBeInTheDocument();
  });

  it('muestra el modal de IA al pulsar Organizar', async () => {
    render(<OpoCalendarApp />);
    await waitForLoading();
    
    const iaButton = screen.getByText(/Organizar con IA/i);
    fireEvent.click(iaButton);

    expect(screen.getByText('Asistente IA')).toBeInTheDocument();
  });

});