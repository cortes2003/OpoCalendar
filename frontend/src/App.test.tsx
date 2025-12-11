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
    // Esperar a que desaparezca el indicador de carga si existe, o esperar un ciclo
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
    
    // Busca el botón que contiene "Nueva"
    const newButtons = screen.getAllByText(/Nueva/i);
    fireEvent.click(newButtons[0]);

    // Verifica que el modal se abre (Header del modal)
    expect(screen.getByRole('heading', { name: 'Nueva' })).toBeInTheDocument();
    // Verifica botón de guardar
    expect(screen.getByText(/Guardar/i)).toBeInTheDocument();
  });

  it('valida que la hora fin no sea anterior a la de inicio', async () => {
    // Usamos 'container' extraído de render para poder buscar por querySelector
    const { container } = render(<OpoCalendarApp />);
    await waitForLoading();
    
    const newButtons = screen.getAllByText(/Nueva/i);
    fireEvent.click(newButtons[0]);

    // Buscar inputs de tipo time
    const timeInputs = container.querySelectorAll('input[type="time"]');
    // timeInputs[0] = Horario Inicio Sidebar
    // timeInputs[1] = Horario Fin Sidebar
    // timeInputs[2] = Inicio Tarea (Modal)
    // timeInputs[3] = Fin Tarea (Modal)
    
    // Aseguramos que estamos tocando los del modal (índices 2 y 3)
    if (timeInputs.length >= 4) {
        fireEvent.change(timeInputs[2], { target: { value: '10:00' } });
        fireEvent.change(timeInputs[3], { target: { value: '09:00' } }); // Fin antes que inicio
    }

    fireEvent.click(screen.getByText(/Guardar/i));

    // Esperar a que aparezca el mensaje de error
    expect(await screen.findByText(/Error horario/i)).toBeInTheDocument();
  });

  it('muestra el modal de IA al pulsar Organizar', async () => {
    render(<OpoCalendarApp />);
    await waitForLoading();
    
    const iaButton = screen.getByText(/Organizar con IA/i);
    fireEvent.click(iaButton);

    expect(screen.getByText(/Asistente IA/i)).toBeInTheDocument();
  });

});