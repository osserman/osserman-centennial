# Candidate bridges & ancestors — pilot_v1

Derived analysis, regenerable via `scripts/rank_candidates.py`. Not a
human judgment: these are ranked leads for manual review. Record decisions
in the `work_roles` / `paper_tags` tables, never by editing this file.

## A. Generation-1 ancestry (fully harvested seed references)

Ranked by number of seeds citing (cross-tree convergence), then Mathematics
topic weight, then citation count.

| OpenAlex | Title | Year | Cited by | # seeds | Math score | Seeds citing |
|----------|-------|------|----------|---------|------------|--------------|
| `W1963952373` | The topology of complete minimal surfaces of finite total Ga | 1983 | 221 | 1 | 1.0 | Computing Discrete Minimal Surfaces and  |
| `W1981666484` | The triply periodic minimal surfaces of Alan Schoen and thei | 1989 | 211 | 1 | 1.0 | Computing Discrete Minimal Surfaces and  |
| `W2064124833` | Embedded minimal surfaces derived from Scherk's examples | 1988 | 154 | 1 | 1.0 | Computing Discrete Minimal Surfaces and  |
| `W1488778760` | New minimal surfaces in $S^3$ | 1988 | 93 | 1 | 1.0 | Computing Discrete Minimal Surfaces and  |
| `W2028759434` | Stationary minimal surfaces with boundary on a simplex | 1984 | 45 | 1 | 1.0 | Computing Discrete Minimal Surfaces and  |
| `W2027889726` | On discrete Dirichlet and plateau problems | 1961 | 31 | 1 | 1.0 | Computing Discrete Minimal Surfaces and  |
| `W2027821735` | New periodic minimal surfaces in H^3 | 1991 | 6 | 1 | 1.0 | Computing Discrete Minimal Surfaces and  |
| `W2058981386` | An algorithm for evolutionary surfaces | 1990 | 353 | 1 | 0.961 | Computing Discrete Minimal Surfaces and  |
| `W2135957449` | A Crystalline Approximation Theorem for Hypersurfaces | 1990 | 51 | 1 | 0.901 | Computing Discrete Minimal Surfaces and  |
| `W1606550863` | Dirichlet’s Principle, Conformal Mapping, and Minimal Surfac | 1977 | 446 | 1 | 0.822 | Computing Discrete Minimal Surfaces and  |
| `W2142557280` | The problem of the least area and the problem of Plateau | 1930 | 124 | 1 | 0.727 | Computing Discrete Minimal Surfaces and  |
| `W2272740539` | Computing conformal maps and minimal surfaces | 1991 | 15 | 1 | 0.7 | Computing Discrete Minimal Surfaces and  |
| `W2085106812` | Discrete solution of the Plateau problem and its convergence | 1987 | 31 | 1 | 0.497 | Computing Discrete Minimal Surfaces and  |
| `W2019892225` | Solution of the problem of Plateau | 1931 | 427 | 1 | 0.478 | Computing Discrete Minimal Surfaces and  |
| `W3098182124` | CONFORMAL ANOMALY OF SUBMANIFOLD OBSERVABLES IN ADS/CFT CORR | 1999 | 211 | 1 | 0.474 | Holographic Derivation of Entanglement E |
| `W2073030628` | Conformal anomaly of submanifold observables in AdS/CFT corr | 1999 | 269 | 1 | 0.472 | Holographic Derivation of Entanglement E |
| `W1969706687` | The Surface Evolver | 1992 | 2343 | 1 | 0.387 | Computing Discrete Minimal Surfaces and  |
| `W2330098160` | Complete Minimal Surfaces in S 3 | 1970 | 679 | 1 | 0.34 | Computing Discrete Minimal Surfaces and  |
| `W3036193711` | Entanglement and alpha entropies for a massive scalar field  | 2005 | 141 | 1 | 0.333 | Holographic Derivation of Entanglement E |
| `W2090069870` | Central charges in the canonical realization of asymptotic s | 1986 | 2776 | 1 | 0.314 | Holographic Derivation of Entanglement E |
| `W2345240022` | Topological entanglement entropy | 2012 | 23 | 1 | 0.244 | Holographic Derivation of Entanglement E |
| `W1983873947` | Numerical solution of the minimal surface equation | 1967 | 72 | 1 | 0.242 | Computing Discrete Minimal Surfaces and  |
| `W2019024022` | Detecting Topological Order in a Ground State Wave Function | 2006 | 2129 | 1 | 0.208 | Holographic Derivation of Entanglement E |
| `W2046439097` | Topological Entanglement Entropy | 2006 | 2495 | 1 | 0.17 | Holographic Derivation of Entanglement E |
| `W2039609754` | Gauge theory correlators from non-critical string theory | 1998 | 9345 | 1 | 0.141 | Holographic Derivation of Entanglement E |
| `W2000858341` | Operator product expansion for Wilson loops and surfaces in  | 1999 | 369 | 1 | 0.131 | Holographic Derivation of Entanglement E |
| `W2163851871` | A covariant entropy conjecture | 1999 | 857 | 1 | 0.111 | Holographic Derivation of Entanglement E |
| `W3000019265` | The Large N Limit of Superconformal Field Theories and Super | 1998 | 10766 | 1 | 0.087 | Holographic Derivation of Entanglement E |
| `W2069840277` | Entanglement entropy and quantum field theory | 2004 | 3326 | 1 | 0.076 | Holographic Derivation of Entanglement E |
| `W4249956767` | The large $N$ limit of superconformal field theories and sup | 1998 | 14582 | 1 | 0.073 | Holographic Derivation of Entanglement E |
| `W2087092625` | <i>AdS</i><sub>3</sub> black holes and a stringy exclusion p | 1998 | 826 | 1 | 0.066 | Holographic Derivation of Entanglement E |
| `W2060083150` | Eternal black holes in anti-de Sitter | 2003 | 1594 | 1 | 0.061 | Holographic Derivation of Entanglement E |
| `W2120998799` | Geometric and renormalized entropy in conformal field theory | 1994 | 1806 | 1 | 0.06 | Holographic Derivation of Entanglement E |
| `W2013888684` | DeSitter entropy, quantum entanglement and ADS/CFT | 2001 | 213 | 1 | 0.059 | Holographic Derivation of Entanglement E |
| `W1612506229` | Dimensional reduction in quantum gravity | 1984 | 497 | 1 | 0.052 | Holographic Derivation of Entanglement E |
| `W4297693385` | Wilson loops in the large N limit at finite temperature1Work | 1998 | 281 | 1 | 0.035 | Holographic Derivation of Entanglement E |
| `W2130491267` | Microscopic origin of the Bekenstein-Hawking entropy | 1996 | 3060 | 1 | 0.012 | Holographic Derivation of Entanglement E |
| `W1889142700` | Anti de Sitter space and holography | 1998 | 13375 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W3103690389` | Gauge Theory Correlators from Non-Critical String Theory | 1998 | 6927 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2141586044` | The world as a hologram | 1995 | 4027 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2129925474` | Anti-de Sitter space, thermal phase transition, and confinem | 1998 | 3983 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W1763748250` | Black hole in three-dimensional spacetime | 1992 | 3894 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W1990516747` | Entanglement in Quantum Critical Phenomena | 2003 | 2838 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W3103311487` | Microscopic origin of the Bekenstein-Hawking entropy | 1996 | 2206 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2023114458` | Wilson Loops in Large<mml:math xmlns:mml="http://www.w3.org/ | 1998 | 1974 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2053387157` | Entropy and area | 1993 | 1874 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2159538982` | Quantum source of entropy for black holes | 1986 | 1464 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2087991043` | Macroscopic strings as heavy quarks: Large-N gauge theory an | 2001 | 1437 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2963584573` | Dimensional reduction in quantum gravity | 1993 | 982 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2124105624` | The Holographic Bound in Anti-de Sitter Space | 1998 | 624 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2070197840` | Entropy and temperature of black 3-branes | 1996 | 565 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2039765042` | Wilson-Polyakov loop at finite temperature in large-N gauge  | 1998 | 457 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W1977928007` | Entanglement and alpha entropies for a massive Dirac field i | 2005 | 297 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W1996725573` | Wilson loops, confinement, and phase transitions in large <i | 1998 | 197 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2117420199` | Entanglement entropy in critical phenomena and analog models | 2006 | 69 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W2117728682` | Entanglement interpretation of black hole entropy in string  | 2006 | 57 | 1 | 0.0 | Holographic Derivation of Entanglement E |
| `W3099283036` | Entanglement Interpretation of Black Hole Entropy in String  | 2005 | 57 | 1 | 0.0 | Holographic Derivation of Entanglement E |

## B. Convergent frontier (candidates to harvest next)

Un-harvested works cited by ≥ 2 already-harvested papers — likely common
ancestors. Harvest the strongest of these next (not by blind recursion).

| OpenAlex | In-degree | Harvested | Title |
|----------|-----------|-----------|-------|
| `W3000019265` | 12 | yes | The Large N Limit of Superconformal Field Theories and Supergravity |
| `W3103690389` | 11 | yes | Gauge Theory Correlators from Non-Critical String Theory |
| `W1889142700` | 10 | yes | Anti de Sitter space and holography |
| `W2053387157` | 10 | yes | Entropy and area |
| `W2036490361` | 9 | no (stub) | (stub — title not yet harvested) |
| `W2120998799` | 9 | yes | Geometric and renormalized entropy in conformal field theory |
| `W2070197840` | 8 | yes | Entropy and temperature of black 3-branes |
| `W2090386790` | 8 | no (stub) | (stub — title not yet harvested) |
| `W2146478425` | 8 | no (stub) | (stub — title not yet harvested) |
| `W2174613881` | 8 | no (stub) | (stub — title not yet harvested) |
| `W4249956767` | 8 | yes | The large $N$ limit of superconformal field theories and supergravity |
| `W2034183153` | 7 | no (stub) | (stub — title not yet harvested) |
| `W2141586044` | 7 | yes | The world as a hologram |
| `W2159538982` | 7 | yes | Quantum source of entropy for black holes |
| `W1980596762` | 6 | no (stub) | (stub — title not yet harvested) |
| `W2011578505` | 6 | no (stub) | (stub — title not yet harvested) |
| `W2013668637` | 6 | no (stub) | (stub — title not yet harvested) |
| `W2023114458` | 6 | yes | Wilson Loops in Large<mml:math xmlns:mml="http://www.w3.org/1998/Math/ |
| `W2087991043` | 6 | yes | Macroscopic strings as heavy quarks: Large-N gauge theory and anti-de  |
| `W2118082065` | 6 | no (stub) | (stub — title not yet harvested) |
| `W2124590498` | 6 | no (stub) | (stub — title not yet harvested) |
| `W2129925474` | 6 | yes | Anti-de Sitter space, thermal phase transition, and confinement in gau |
| `W2144012213` | 6 | no (stub) | (stub — title not yet harvested) |
| `W3100409240` | 6 | no (stub) | (stub — title not yet harvested) |
| `W1612506229` | 5 | yes | Dimensional reduction in quantum gravity |
| `W1964744959` | 5 | no (stub) | (stub — title not yet harvested) |
| `W1990516747` | 5 | yes | Entanglement in Quantum Critical Phenomena |
| `W2088299329` | 5 | no (stub) | (stub — title not yet harvested) |
| `W2090069870` | 5 | yes | Central charges in the canonical realization of asymptotic symmetries: |
| `W2121607258` | 5 | no (stub) | (stub — title not yet harvested) |
| `W3101795286` | 5 | no (stub) | (stub — title not yet harvested) |
| `W1965571158` | 4 | no (stub) | (stub — title not yet harvested) |
| `W2002598418` | 4 | no (stub) | (stub — title not yet harvested) |
| `W2013888684` | 4 | yes | DeSitter entropy, quantum entanglement and ADS/CFT |
| `W2022574854` | 4 | no (stub) | (stub — title not yet harvested) |
| `W2030654484` | 4 | no (stub) | (stub — title not yet harvested) |
| `W2032536594` | 4 | no (stub) | (stub — title not yet harvested) |
| `W2033498130` | 4 | no (stub) | (stub — title not yet harvested) |
| `W2046439097` | 4 | yes | Topological Entanglement Entropy |
| `W2046703947` | 4 | no (stub) | (stub — title not yet harvested) |
| `W2060083150` | 4 | yes | Eternal black holes in anti-de Sitter |
| `W2064448358` | 4 | no (stub) | (stub — title not yet harvested) |
| `W2087092625` | 4 | yes | <i>AdS</i><sub>3</sub> black holes and a stringy exclusion principle |
| `W2095329260` | 4 | no (stub) | (stub — title not yet harvested) |
| `W2124105624` | 4 | yes | The Holographic Bound in Anti-de Sitter Space |
| `W2223282020` | 4 | no (stub) | (stub — title not yet harvested) |
| `W2330098160` | 4 | yes | Complete Minimal Surfaces in S 3 |
| `W3099977794` | 4 | no (stub) | (stub — title not yet harvested) |
| `W3103280686` | 4 | no (stub) | (stub — title not yet harvested) |
| `W1501466444` | 3 | no (stub) | (stub — title not yet harvested) |
| `W1509346826` | 3 | no (stub) | (stub — title not yet harvested) |
| `W1606550863` | 3 | yes | Dirichlet’s Principle, Conformal Mapping, and Minimal Surfaces |
| `W1771066378` | 3 | no (stub) | (stub — title not yet harvested) |
| `W1816767040` | 3 | no (stub) | (stub — title not yet harvested) |
| `W1971350117` | 3 | no (stub) | (stub — title not yet harvested) |
| `W1972290465` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2010930038` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2011757658` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2016849204` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2017562297` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2022487148` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2023953089` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2024420461` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2024921727` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2027889726` | 3 | yes | On discrete Dirichlet and plateau problems |
| `W2028759434` | 3 | yes | Stationary minimal surfaces with boundary on a simplex |
| `W2033208814` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2033649663` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2039609754` | 3 | yes | Gauge theory correlators from non-critical string theory |
| `W2042650304` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2043483422` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2048192939` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2060720876` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2065805883` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2069840277` | 3 | yes | Entanglement entropy and quantum field theory |
| `W2071313683` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2071955904` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2081062696` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2084042440` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2084722249` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2086924461` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2089789270` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2093297646` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2107240173` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2117648611` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2128221022` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2130491267` | 3 | yes | Microscopic origin of the Bekenstein-Hawking entropy |
| `W2133627134` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2150781355` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2152579451` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2166574392` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2168712029` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2756559474` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2950481832` | 3 | no (stub) | (stub — title not yet harvested) |
| `W2963584573` | 3 | yes | Dimensional reduction in quantum gravity |
| `W3098226834` | 3 | no (stub) | (stub — title not yet harvested) |
| `W3103311487` | 3 | yes | Microscopic origin of the Bekenstein-Hawking entropy |
| `W141448014` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1486912333` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1503503090` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1508284700` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1566834430` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1615683453` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1763748250` | 2 | yes | Black hole in three-dimensional spacetime |
| `W1803034687` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1963826472` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1971014530` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1971364186` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1971606033` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1971728106` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1974678171` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1975139933` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1975455746` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1977372740` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1977512222` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1977534155` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1984264445` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1992204683` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1993673172` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1994796114` | 2 | no (stub) | (stub — title not yet harvested) |
| `W1996517373` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2000858341` | 2 | yes | Operator product expansion for Wilson loops and surfaces in the large< |
| `W2001511269` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2001521411` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2003059230` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2005830754` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2006571742` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2007185418` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2008259798` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2008797769` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2010336806` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2010783407` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2011347314` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2014345595` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2016407890` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2016432273` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2017133042` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2018192827` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2018621138` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2019024022` | 2 | yes | Detecting Topological Order in a Ground State Wave Function |
| `W2019892225` | 2 | yes | Solution of the problem of Plateau |
| `W2020764541` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2021912075` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2022109344` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2024476301` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2026981346` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2027761034` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2029345718` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2029403139` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2031192616` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2031569358` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2031672422` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2033909248` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2037242760` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2039765042` | 2 | yes | Wilson-Polyakov loop at finite temperature in large-N gauge theory and |
| `W2042902653` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2042923499` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2044031735` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2050368830` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2052001139` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2052524636` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2052684603` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2053488214` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2053606402` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2053892631` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2055084512` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2055112188` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2057305625` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2057529053` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2059327787` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2060174253` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2061809405` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2062009667` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2062750063` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2063613245` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2068106645` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2068367705` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2068704126` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2069111311` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2071939979` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2075503549` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2076576844` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2081516391` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2086394143` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2086731073` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2086867460` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2089616236` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2090564590` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2090948935` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2092840968` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2094219754` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2095263597` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2095711067` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2111145493` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2111197042` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2112819624` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2114071493` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2117728682` | 2 | yes | Entanglement interpretation of black hole entropy in string theory |
| `W2131101882` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2133381065` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2135273380` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2136453856` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2139502098` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2145023644` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2145064892` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2146203925` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2148986778` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2150718437` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2151731714` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2154320483` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2162284105` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2171462644` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2172033635` | 2 | no (stub) | (stub — title not yet harvested) |
| `W2323980249` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3037535806` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3046250124` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3098004728` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3098399088` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3099253649` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3099283036` | 2 | yes | Entanglement Interpretation of Black Hole Entropy in String Theory |
| `W3099325045` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3099498863` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3099515475` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3099789643` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3099990792` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3101653534` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3101781964` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3102136537` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3102320448` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3102778279` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3103130695` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3103637725` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3103741009` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3104282713` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3105153511` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3105702733` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3121306087` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3121966797` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3122760832` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3124607939` | 2 | no (stub) | (stub — title not yet harvested) |
| `W3216958049` | 2 | no (stub) | (stub — title not yet harvested) |
| `W4232775945` | 2 | no (stub) | (stub — title not yet harvested) |
| `W6642681490` | 2 | no (stub) | (stub — title not yet harvested) |
| `W6785573804` | 2 | no (stub) | (stub — title not yet harvested) |
