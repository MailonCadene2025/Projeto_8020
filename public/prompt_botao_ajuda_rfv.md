# PROMPT PARA ADICIONAR CARD DE AJUDA RFV

## OBJETIVO
Implementar um botão de ajuda (ícone 💡 ou ❓) no canto superior direito da página que, ao ser clicado, exibe um card informativo explicando de forma didática e visual como interpretar a análise RFV.

## TAREFA

### 1. CRIAR BOTÃO DE AJUDA
```jsx
// Adicione próximo aos filtros/exportar:
<button 
  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2"
  onClick={() => setShowHelpCard(true)}
>
  💡 Como interpretar
</button>
```

### 2. CRIAR MODAL/CARD INFORMATIVO
O card deve ter as seguintes seções organizadas de forma visual:

#### HEADER DO CARD
```
🎯 Guia Rápido: Análise RFV (Recência, Frequência, Valor)
[X] - botão fechar
```

#### SEÇÃO 1: O QUE É RFV? 
```
📊 RFV em 30 segundos:
• R = Há quanto tempo comprou (Recência)
• F = Quantas vezes comprou (Frequência)  
• V = Quanto gastou (Valor)
• Score = Combinação dos 3 (ex: 555 = melhor cliente)
```

#### SEÇÃO 2: ENTENDENDO OS SEGMENTOS
```
🏆 CAMPEÃO (555-544)
→ Seus melhores clientes! Compram recente, frequente e muito.
→ Ação: Programa VIP, produtos premium

💎 LEAL (444-435)  
→ Clientes fiéis, base sólida do negócio.
→ Ação: Ofertas especiais, cross-sell

🌟 NOVO (522-311)
→ Clientes com potencial de crescimento.
→ Ação: Nutrição, onboarding, acompanhamento

📊 OUTROS (525-321)
→ Clientes diversos, análise individual.
→ Ação: Segmentação específica

😴 HIBERNANDO (111)
→ Parados há muito tempo, sem compras recentes.
→ Ação: Campanha de reativação urgente
```

#### SEÇÃO 3: CORES E SÍMBOLOS
```
🚦 Semáforo de Recência:
🟢 Verde = Ativo (≤30 dias)
🟡 Amarelo = Atenção (31-90 dias)  
🔴 Vermelho = Risco (>90 dias)

📈📉 Tendências:
📈 CRESCENDO = Faturamento subindo
📉 DECLINANDO = Faturamento caindo
➡️ ESTÁVEL = Sem mudanças significativas
```

#### SEÇÃO 4: COMO USAR OS FILTROS
```
🎛️ Filtros Inteligentes:
• Segmento RFV: Filtre por tipo de cliente
• Score RFV: Ajuste o range 111-555
• Tendência: Veja quem está crescendo/caindo
• Prioridade: Foque no que é urgente
```

#### SEÇÃO 5: AÇÕES PRÁTICAS
```
🎯 Próximos Passos:
1️⃣ Identifique seus 🏆 CAMPEÕES → Mantenha-os felizes
2️⃣ Desenvolva os 🌟 NOVOS → Potencial de crescimento  
3️⃣ Reative os 😴 HIBERNANDO → Oportunidade perdida
4️⃣ Monitore 📉 DECLINANDO → Evite churn

💡 Dica: Use os filtros para criar listas específicas e exportar para ações direcionadas!
```

### 3. ESTILO DO CARD
```css
// Card deve ter:
- Largura: 600px (responsivo)
- Background: Branco com sombra suave
- Border radius: 12px
- Overlay escuro transparente (backdrop)
- Animação de entrada suave
- Scroll interno se necessário
- Botões de navegação entre seções (opcional)
```

### 4. INTERAÇÕES
- **Abrir:** Clique no botão "💡 Como interpretar"
- **Fechar:** Clique no X, ESC, ou fora do card
- **Navegação:** Seções organizadas de forma fluida
- **Responsivo:** Adaptável para mobile

### 5. IMPLEMENTAÇÃO TÉCNICA

#### Estado para controlar o modal:
```jsx
const [showHelpCard, setShowHelpCard] = useState(false);
```

#### Componente do card:
```jsx
{showHelpCard && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 max-w-2xl max-h-[80vh] overflow-y-auto">
      {/* Conteúdo do card aqui */}
    </div>
  </div>
)}
```

## RESULTADO ESPERADO

Um card informativo que:
✅ Explique RFV de forma simples e visual
✅ Use emojis e cores para facilitar entendimento  
✅ Seja prático e acionável
✅ Não seja massante (máximo 2-3 telas)
✅ Tenha design limpo e profissional
✅ Seja responsivo para mobile
✅ Ajude usuários iniciantes e avançados

## POSICIONAMENTO DO BOTÃO
Coloque o botão "💡 Como interpretar" próximo ao botão "Exportar" no canto superior direito da tabela, mantendo a harmonia visual da interface.

Execute esta implementação mantendo a consistência com o design atual da página!