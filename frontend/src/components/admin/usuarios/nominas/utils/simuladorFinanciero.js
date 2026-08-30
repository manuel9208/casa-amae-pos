// ==============================================================================
// SIMULADOR FINANCIERO EN TIEMPO REAL
// ==============================================================================  

export const calcularSimulacionFinanciera = (plantillaSemanal, sueldoBase, tipoSueldo) => {
    let horasTotalesSemana = 0;
    let diasLaborales = 0;
    let diasDescansoPagado = 0;
    const base = Number(sueldoBase) || 0;  

    Object.values(plantillaSemanal).forEach(dia => {
        if (dia.activo) {
            diasLaborales++;
            if (dia.entrada && dia.salida) {
                const [hE, mE] = dia.entrada.split(':').map(Number);
                const [hS, mS] = dia.salida.split(':').map(Number);
                let minutos = (hS * 60 + mS) - (hE * 60 + mE);
                if (minutos < 0) minutos += 24 * 60;
                horasTotalesSemana += (minutos / 60);
            }
        } else if (dia.es_descanso) {
            diasDescansoPagado++;
        }
    });  

    const diasPagadosLFT = diasLaborales + diasDescansoPagado;
    const divisorDias = diasPagadosLFT > 0 ? diasPagadosLFT : 7;  

    let sueldoSemanalEstimado = base;
    let sueldoDiarioReal = 0;  

    // 👇 LA MAGIA: El sueldo Semanal ahora usa tu divisor de días dinámico (Ej. 4 días) en vez de 7
    switch (tipoSueldo) {
        case 'Mensual':
            sueldoSemanalEstimado = base / 4.333;
            sueldoDiarioReal = sueldoSemanalEstimado / divisorDias;
            break;
        case 'Quincenal':
            sueldoSemanalEstimado = base / 2.166;
            sueldoDiarioReal = sueldoSemanalEstimado / divisorDias;
            break;
        case 'Semanal':
            sueldoSemanalEstimado = base;
            sueldoDiarioReal = base / divisorDias; // FIX APLICADO AQUÍ
            break;
        case 'Por Día':
        case 'Diario':
            sueldoSemanalEstimado = base * divisorDias;
            sueldoDiarioReal = base;
            break;
        case 'Por Hora':
            sueldoSemanalEstimado = base * horasTotalesSemana;
            sueldoDiarioReal = horasTotalesSemana > 0 ? (sueldoSemanalEstimado / divisorDias) : 0;
            break;
        default:
            sueldoSemanalEstimado = base;
            sueldoDiarioReal = base / divisorDias;
            break;
    }  

    const sueldoHoraReal = horasTotalesSemana > 0 ? (sueldoSemanalEstimado / horasTotalesSemana) : 0;  

    return {
        horasTotalesSemana: horasTotalesSemana.toFixed(1),
        diasLaborales,
        diasDescansoPagado,
        diasPagadosLFT,
        sueldoSemanalEstimado,
        sueldoDiarioReal,
        sueldoHoraReal
    };
};