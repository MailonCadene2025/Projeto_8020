# PROMPT PARA MELHORIA DA CENTRAL DE INTELIGÊNCIA RFV

## CONTEXTO
Tenho uma central de BI para análise de clientes com os seguintes dados atuais:
- 610 clientes cadastrados
- Colunas: Cliente, Última compra, Dias sem comprar, Pedidos 12m, Faturamento 12m, Média intervalo
- Sistema de filtros por data, localização, vendedor, categoria e tipo de cliente

## OBJETIVO
Implementar melhorias para transformar em uma análise RFV completa com segmentação automática e alertas inteligentes.

## TAREFAS A EXECUTAR

### 1. CRIAR CÁLCULO DE SCORE RFV
```sql
-- Adicione as seguintes colunas calculadas:

-- Score de Recência (1-5)
CASE 
    WHEN dias_sem_comprar <= 30 THEN 5
    WHEN dias_sem_comprar <= 60 THEN 4
    WHEN dias_sem_comprar <= 90 THEN 3
    WHEN dias_sem_comprar <= 180 THEN 2
    ELSE 1
END AS score_recencia

-- Score de Frequência (1-5)
CASE 
    WHEN pedidos_12m >= 15 THEN 5
    WHEN pedidos_12m >= 10 THEN 4
    WHEN pedidos_12m >= 6 THEN 3
    WHEN pedidos_12m >= 3 THEN 2
    ELSE 1
END AS score_frequencia

-- Score de Valor (1-5) - Baseado nos dados vistos
CASE 
    WHEN faturamento_12m >= 400000 THEN 5
    WHEN faturamento_12m >= 200000 THEN 4
    WHEN faturamento_12m >= 100000 THEN 3
    WHEN faturamento_12m >= 50000 THEN 2
    ELSE 1
END AS score_valor

-- Score RFV Combinado
CONCAT(score_recencia, score_frequencia, score_valor) AS score_rfv
```

### 2. CRIAR SEGMENTAÇÃO AUTOMÁTICA
```sql
-- Adicione coluna de segmentação:
CASE 
    WHEN score_rfv IN ('555', '554', '544', '545', '454', '455', '445') THEN '🏆 CAMPEÃO'
    WHEN score_rfv IN ('543', '444', '435', '355', '354', '345', '344', '335') THEN '💎 LEAL'
    WHEN score_rfv IN ('512', '511', '422', '421', '412', '411', '311') THEN '🌟 NOVO'
    WHEN score_rfv IN ('155', '154', '144', '214', '215', '115', '114', '113') THEN '⚠️ RISCO'
    WHEN score_rfv IN ('255', '155', '151', '141', '131', '121', '111', '152', '142') THEN '😴 HIBERNANDO'
    ELSE '📊 OUTROS'
END AS segmento
```

### 3. ADICIONAR MÉTRICAS CALCULADAS
```sql
-- Ticket médio
ROUND(faturamento_12m / NULLIF(pedidos_12m, 0), 2) AS ticket_medio

-- Tendência (comparar últimos 6 meses vs 6 anteriores)
CASE 
    WHEN faturamento_6m > faturamento_6m_anterior THEN '📈 CRESCENDO'
    WHEN faturamento_6m < faturamento_6m_anterior THEN '📉 DECLINANDO'
    ELSE '➡️ ESTÁVEL'
END AS tendencia

-- Status visual por dias sem comprar
CASE 
    WHEN dias_sem_comprar <= 30 THEN '🟢'
    WHEN dias_sem_comprar <= 90 THEN '🟡'
    ELSE '🔴'
END AS status_visual
```

### 4. CRIAR DASHBOARD RESUMO SUPERIOR
```sql
-- Query para cards de resumo:
SELECT 
    segmento,
    COUNT(*) as qtd_clientes,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentual,
    SUM(faturamento_12m) as faturamento_total,
    ROUND(AVG(faturamento_12m), 0) as ticket_medio_segmento
FROM tabela_rfv
GROUP BY segmento
ORDER BY faturamento_total DESC
```

### 5. IMPLEMENTAR ALERTAS E AÇÕES
```sql
-- Coluna de ações recomendadas:
CASE 
    WHEN segmento = '🏆 CAMPEÃO' THEN 'Programa VIP + Produtos Premium'
    WHEN segmento = '💎 LEAL' THEN 'Cross-sell + Fidelização'
    WHEN segmento = '🌟 NOVO' THEN 'Onboarding + Acompanhamento'
    WHEN segmento = '⚠️ RISCO' THEN 'URGENTE: Campanha Reativação'
    WHEN segmento = '😴 HIBERNANDO' THEN 'Pesquisa + Oferta Especial'
    ELSE 'Análise Individual'
END AS acao_recomendada

-- Prioridade de contato:
CASE 
    WHEN segmento = '⚠️ RISCO' THEN 'ALTA'
    WHEN segmento = '🏆 CAMPEÃO' THEN 'ALTA'
    WHEN segmento = '💎 LEAL' THEN 'MÉDIA'
    WHEN segmento = '🌟 NOVO' THEN 'MÉDIA'
    ELSE 'BAIXA'
END AS prioridade
```

### 6. LAYOUT DA TABELA FINAL
Organize as colunas nesta ordem:
1. Status Visual (🟢🟡🔴)
2. Cliente
3. Segmento (🏆💎🌟⚠️😴)
4. Score RFV (543)
5. Última Compra
6. Dias sem Comprar
7. Pedidos 12m
8. Faturamento 12m
9. Ticket Médio
10. Tendência (📈📉➡️)
11. Ação Recomendada
12. Prioridade

### 7. FILTROS ADICIONAIS
Adicione estes novos filtros:
- Segmento RFV (dropdown)
- Score RFV (range slider 111-555)
- Prioridade (Alta/Média/Baixa)
- Tendência (Crescendo/Declinando/Estável)

### 8. CARDS DE KPI NO TOPO
```
[🏆 CAMPEÕES]     [💎 LEAIS]        [⚠️ EM RISCO]    [💰 RECEITA TOTAL]
   XX clientes       XX clientes       XX clientes       R$ XXX.XXX
   XX% da base      XX% da base       XX% da base       XX% do target

[📈 CRESCENDO]    [📉 DECLINANDO]   [🎯 OPORTUNIDADE] [⏰ AÇÃO URGENTE]
   XX clientes       XX clientes       R$ XXX.XXX       XX clientes
```

## CONFIGURAÇÕES TÉCNICAS

### Cores para Status:
- 🟢 Verde: #22C55E (ativo)
- 🟡 Amarelo: #F59E0B (atenção)  
- 🔴 Vermelho: #EF4444 (risco)

### Cores para Segmentos:
- 🏆 Campeão: #FFD700 (dourado)
- 💎 Leal: #3B82F6 (azul)
- 🌟 Novo: #10B981 (verde)
- ⚠️ Risco: #F59E0B (laranja)
- 😴 Hibernando: #6B7280 (cinza)

### Ordenação Padrão:
1. Prioridade (Alta → Baixa)
2. Faturamento 12m (Maior → Menor)
3. Dias sem comprar (Menor → Maior)

## RESULTADO ESPERADO
Uma central de BI completa que permita:
✅ Identificação visual imediata do status do cliente
✅ Segmentação automática baseada em RFV
✅ Ações claras para cada tipo de cliente
✅ Alertas para clientes em risco
✅ Métricas de performance por segmento
✅ Priorização de esforços comerciais

Execute estas implementações e me retorne com o resultado final!