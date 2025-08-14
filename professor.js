// Professor Module - professor.js
document.addEventListener('DOMContentLoaded', function() {
    // Inicializa a consulta
    initProfessorConsulta();
});

function initProfessorConsulta() {
    // Elementos da página
    const professorSelect = document.getElementById('professor-select');
    const btnConsultar = document.getElementById('btn-consultar');
    const horarioContainer = document.getElementById('horario-container');
    const professorNomeTitulo = document.getElementById('professor-nome-titulo');
    const horariosGrid = document.getElementById('horarios-grid');
    const btnPrint = document.getElementById('btn-print-horario');

    // Carrega a lista de professores
    function loadProfessores() {
        professorSelect.innerHTML = '<option value="">-- Carregando professores --</option>';
        
        const professoresRef = window.dbRef(window.firebaseDB, 'professores');
        window.dbOnValue(professoresRef, (snapshot) => {
            const professores = snapshot.val() || {};
            professorSelect.innerHTML = '<option value="">-- Selecione seu nome --</option>';
            
            Object.values(professores).forEach(prof => {
                const option = document.createElement('option');
                option.value = prof.id;
                option.textContent = prof.nome;
                professorSelect.appendChild(option);
            });
        });
    }

    // Consulta o horário do professor selecionado
    function consultarHorario() {
        const professorId = professorSelect.value;
        if (!professorId) {
            showAlert('Selecione um professor', 'warning');
            return;
        }

        const professorRef = window.dbRef(window.firebaseDB, `professores/${professorId}`);
        window.dbOnValue(professorRef, (snapshot) => {
            const professor = snapshot.val();
            if (!professor) return;

            // Atualiza o título
            professorNomeTitulo.textContent = `Horário do Professor: ${professor.nome}`;
            
            // Carrega os horários
            loadHorariosProfessor(professorId, professor.nome);
            horarioContainer.style.display = 'block';
        });
    }

    // Carrega e exibe os horários do professor
    function loadHorariosProfessor(professorId, professorNome) {
        const horariosRef = window.dbRef(window.firebaseDB, 'horarios');
        window.dbOnValue(horariosRef, (snapshot) => {
            const allHorarios = snapshot.val() || {};
            const horariosProfessor = Object.values(allHorarios).filter(
                h => h.idProfessor === professorId
            );

            if (horariosProfessor.length === 0) {
                horariosGrid.innerHTML = '<p class="no-activity">Nenhum horário cadastrado para este professor.</p>';
                return;
            }

            // Agrupa horários por turma
            const horariosPorTurma = {};
            horariosProfessor.forEach(horario => {
                if (!horariosPorTurma[horario.idTurma]) {
                    horariosPorTurma[horario.idTurma] = [];
                }
                horariosPorTurma[horario.idTurma].push(horario);
            });

            // Gera a visualização
            renderHorariosProfessor(horariosPorTurma, professorNome);
        });
    }

    // Renderiza os horários na grade
    function renderHorariosProfessor(horariosPorTurma, professorNome) {
        let html = '';
        
        Object.keys(horariosPorTurma).forEach(turmaId => {
            const turma = appData.turmas[turmaId];
            if (!turma) return;
            
            const config = HORARIOS_CONFIG[turma.turno];
            const horariosTurma = horariosPorTurma[turmaId];
            
            html += `
                <div class="turma-section">
                    <h3>Turma: ${turma.nome}</h3>
                    <table class="grade-horarios">
                        <thead>
                            <tr>
                                <th>Horário</th>
                                ${config.dias.map(dia => `<th>${formatDiaName(dia)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            if (turma.turno === 'matutino') {
                config.blocos.forEach(bloco => {
                    html += `<tr><td class="horario-label">${bloco.inicio} - ${bloco.fim}</td>`;
                    
                    config.dias.forEach(dia => {
                        const horario = horariosTurma.find(h => 
                            h.diaSemana === dia && h.bloco === bloco.id
                        );
                        
                        if (horario) {
                            const disciplina = appData.disciplinas[horario.idDisciplina];
                            const sala = appData.salas[horario.idSala];
                            html += `
                                <td class="horario-slot ocupado">
                                    <div class="horario-info">
                                        <div class="disciplina">${disciplina?.nome || 'N/A'}</div>
                                        <div class="sala">${sala?.nome || 'N/A'}</div>
                                    </div>
                                </td>
                            `;
                        } else {
                            html += '<td class="horario-slot"></td>';
                        }
                    });
                    html += '</tr>';
                });
            } else {
                // Lógica para turno noturno (similar ao matutino)
                const maxBlocos = Math.max(...config.dias.map(dia => config.blocos[dia].length));
                
                for (let i = 0; i < maxBlocos; i++) {
                    html += '<tr>';
                    const horariosLabels = config.dias.map(dia => {
                        const bloco = config.blocos[dia][i];
                        return bloco ? `${bloco.inicio} - ${bloco.fim}` : '';
                    }).filter(h => h);
                    
                    const horarioUnico = [...new Set(horariosLabels)];
                    html += `<td class="horario-label">${horarioUnico.join(' / ')}</td>`;
                    
                    config.dias.forEach(dia => {
                        const bloco = config.blocos[dia][i];
                        if (bloco) {
                            const horario = horariosTurma.find(h => 
                                h.diaSemana === dia && h.bloco === bloco.id
                            );
                            
                            if (horario) {
                                const disciplina = appData.disciplinas[horario.idDisciplina];
                                const sala = appData.salas[horario.idSala];
                                html += `
                                    <td class="horario-slot ocupado">
                                        <div class="horario-info">
                                            <div class="disciplina">${disciplina?.nome || 'N/A'}</div>
                                            <div class="sala">${sala?.nome || 'N/A'}</div>
                                        </div>
                                    </td>
                                `;
                            } else {
                                html += '<td class="horario-slot"></td>';
                            }
                        } else {
                            html += '<td class="horario-slot disabled"></td>';
                        }
                    });
                    html += '</tr>';
                }
            }
            
            html += `</tbody></table></div>`;
        });
        
        horariosGrid.innerHTML = html;
    }

    // Configura eventos
    btnConsultar.addEventListener('click', consultarHorario);
    btnPrint.addEventListener('click', () => {
        if (horarioContainer.style.display === 'block') {
            window.print();
        } else {
            showAlert('Consulte um horário primeiro', 'warning');
        }
    });

    // Inicializa
    loadProfessores();
}

// Função auxiliar para formatar nome do dia
function formatDiaName(dia) {
    const diasMap = {
        'segunda': 'Segunda',
        'terca': 'Terça',
        'quarta': 'Quarta',
        'quinta': 'Quinta',
        'sexta': 'Sexta',
        'sabado': 'Sábado'
    };
    return diasMap[dia] || dia;
}