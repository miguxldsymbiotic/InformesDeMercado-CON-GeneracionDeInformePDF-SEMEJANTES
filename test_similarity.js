// const fetch = require('node-fetch'); // fetch es nativo en Node v18+

const API_URL = "http://127.0.0.1:8000";

async function testSimilarity(targetName, targetSnies) {
    console.log(`\n--- TEST SIMILITUD PARA: "${targetName}" (SNIES: ${targetSnies}) ---`);
    
    try {
        const response = await fetch(`${API_URL}/national/filter-options/program`);
        if (!response.ok) throw new Error("No se pudo conectar al backend.");
        const allProgs = await response.json();

        const stopWords = new Set(['de', 'la', 'el', 'en', 'y', 'con', 'para', 'o', 'un', 'una', 'del', 'al']);
        const tokens = targetName.toLowerCase()
            .split(/[\s,.-]+/)
            .filter(t => t.length > 2 && !stopWords.has(t));
        
        console.log(`Tokens identificados: [${tokens.join(', ')}]`);

        const results = allProgs
            .filter(p => p.snies !== targetSnies)
            .map(p => {
                const pTokens = p.programa.toLowerCase().split(/[\s,.-]+/);
                const matches = tokens.filter(t => pTokens.some(pt => pt.includes(t)));
                return { program: p, score: matches.length };
            })
            .filter(res => res.score >= Math.min(tokens.length, 2)) 
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        if (results.length === 0) {
            console.log("No se encontraron programas semejantes.");
        } else {
            console.log("TOP 5 SEMEJANTES ENCONTRADOS:");
            results.slice(0, 5).forEach((res, i) => {
                console.log(`${i+1}. ${res.program.programa} | SNIES: ${res.program.snies} | ${res.program.institucion}`);
            });
            console.log(`\nTotal semejantes detectados en base de datos: ${results.length}`);
            console.log("--------------------------------------------------\n");
        }
    } catch (error) {
        console.error("Error en el test:", error.message);
    }
}

// Ejecutar test con el ejemplo del usuario
testSimilarity("ADMINISTRACION DE EMPRESAS", "2051");
