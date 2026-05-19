const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function measure(name, command, args, pollInterval = 20) {
    return new Promise((resolve) => {
        let maxRss = 0;
        const start = Date.now();
        
        const child = spawn(command, args, {
            stdio: 'ignore',
            shell: true,
            env: { ...process.env, PATH: `${process.cwd()}/node_modules/.bin:${process.env.PATH}` }
        });

        const interval = setInterval(() => {
            try {
                // On Linux, /proc/[pid]/status gives real-time memory stats
                if (fs.existsSync(`/proc/${child.pid}/status`)) {
                    const status = fs.readFileSync(`/proc/${child.pid}/status`, 'utf8');
                    const rssMatch = status.match(/VmRSS:\s+(\d+)\s+kB/);
                    if (rssMatch) {
                        const rss = parseInt(rssMatch[1], 10);
                        if (rss > maxRss) maxRss = rss;
                    }
                }
            } catch (e) {}
        }, pollInterval);

        child.on('exit', (code) => {
            clearInterval(interval);
            const elapsed = (Date.now() - start) / 1000;
            resolve({
                elapsed,
                memory: maxRss / 1024,
                code
            });
        });
    });
}

async function runBenchmark(name, command, args, iterations = 3) {
    console.log(`\n🧪 Benchmarking ${name} (${iterations} iterations)...`);
    const runs = [];
    
    for (let i = 0; i < iterations; i++) {
        process.stdout.write(`  Run ${i + 1}/${iterations}... `);
        const result = await measure(name, command, args);
        if (result.code === 0) {
            runs.push(result);
            console.log(`DONE (${result.elapsed.toFixed(2)}s, ${result.memory.toFixed(2)}MB)`);
        } else {
            console.log(`FAILED (${result.code})`);
        }
    }

    if (runs.length === 0) return null;

    const avgTime = runs.reduce((sum, r) => sum + r.elapsed, 0) / runs.length;
    const avgMem = runs.reduce((sum, r) => sum + r.memory, 0) / runs.length;

    return { name, avgTime, avgMem };
}

async function run() {
    console.log('🚀 Starting Explicit Engine Benchmark...');
    const iterations = 3;
    const testProject = 'benchmark/test-project';
    
    // 1. Measure CodePulse Baseline (No-op)
    const baseline = await measure('CodePulse Baseline', 'node', ['dist/index.js', '--version'], 50);
    const baselineRss = baseline.memory;
    console.log(`\nℹ️  CodePulse Baseline (Node.js + CLI Bootstrap): ${baselineRss.toFixed(2)} MB`);

    const finalResults = [];
    
    // 2. Raw ESLint
    const eslintRaw = await runBenchmark(
        'Raw ESLint', 
        'eslint', 
        [path.join(testProject, 'src'), '-c', path.join(testProject, '.eslintrc.json'), '--format', 'json'],
        iterations
    );
    if (eslintRaw) finalResults.push(eslintRaw);

    // 3. CodePulse (Oxlint Engine)
    const cpOxlint = await runBenchmark(
        'CodePulse (Oxlint)', 
        'node', 
        ['dist/index.js', 'scan', testProject, '--engine', 'oxlint', '--json'],
        iterations
    );
    if (cpOxlint) finalResults.push(cpOxlint);

    // 4. CodePulse (ESLint Engine)
    const cpEslint = await runBenchmark(
        'CodePulse (ESLint)', 
        'node', 
        ['dist/index.js', 'scan', testProject, '--engine', 'eslint', '--json'],
        iterations
    );
    if (cpEslint) finalResults.push(cpEslint);

    console.log('\n📊 Final Benchmark Analysis');
    console.log('-----------------------------------------------------------------------------');
    console.log(`| ${'Tool/Engine'.padEnd(20)} | ${'Time (s)'.padEnd(10)} | ${'Peak RSS (MB)'.padEnd(14)} |`);
    console.log('|----------------------|------------|----------------|');
    
    for (const r of finalResults) {
        console.log(`| ${r.name.padEnd(20)} | ${r.avgTime.toFixed(2).padEnd(10)} | ${r.avgMem.toFixed(2).padEnd(14)} |`);
    }
    console.log('-----------------------------------------------------------------------------');
}

run();
