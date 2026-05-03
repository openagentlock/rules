# Graph Report - openagentlock-rules  (2026-05-02)

## Corpus Check
- 3 files · ~2,879 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 13 nodes · 19 edges · 3 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]

## God Nodes (most connected - your core abstractions)
1. `ruleCard()` - 5 edges
2. `render()` - 5 edges
3. `el()` - 4 edges
4. `main()` - 3 edges
5. `readmeExcerpt()` - 2 edges
6. `buildIndex()` - 2 edges
7. `INSTALL_CMD()` - 2 edges
8. `severityClass()` - 2 edges
9. `activeSeverities()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `ruleCard()` --calls--> `el()`  [EXTRACTED]
  site/app.js → site/app.js  _Bridges community 0 → community 2_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.6
Nodes (4): activeSeverities(), el(), main(), render()

### Community 1 - "Community 1"
Cohesion: 1.0
Nodes (2): buildIndex(), readmeExcerpt()

### Community 2 - "Community 2"
Cohesion: 0.67
Nodes (3): INSTALL_CMD(), ruleCard(), severityClass()

## Knowledge Gaps
- **Thin community `Community 1`** (3 nodes): `buildIndex()`, `readmeExcerpt()`, `build-index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ruleCard()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `render()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `el()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._