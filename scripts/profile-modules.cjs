#!/usr/bin/env node
/**
 * Module Loading Profiler for Lumina Reader
 * 
 * Usage:
 *   node scripts/profile-modules.js [module-name]
 * 
 * Examples:
 *   node scripts/profile-modules.js epubjs
 *   node scripts/profile-modules.js framer-motion
 *   node scripts/profile-modules.js localforage
 */

const { performance } = require('perf_hooks');

const targetModule = process.argv[2];

if (!targetModule) {
  console.log('📊 Lumina Reader Module Profiler\n');
  console.log('Usage: node scripts/profile-modules.js <module-name>');
  console.log('\nCommon modules to profile:');
  console.log('  - epubjs');
  console.log('  - framer-motion');
  console.log('  - localforage');
  console.log('  - react');
  console.log('  - react-dom');
  console.log('\nOr profile all: node scripts/profile-modules.js --all');
  process.exit(0);
}

// Profile a single module
function profileModule(name) {
  const start = performance.now();
  const startMem = process.memoryUsage();
  
  try {
    require(name);
    const end = performance.now();
    const endMem = process.memoryUsage();
    
    const loadTime = (end - start).toFixed(2);
    const heapDelta = ((endMem.heapUsed - startMem.heapUsed) / 1024 / 1024).toFixed(2);
    
    return {
      name,
      loadTime: `${loadTime}ms`,
      heapDelta: `${heapDelta}MB`,
      success: true
    };
  } catch (error) {
    return {
      name,
      error: error.message,
      success: false
    };
  }
}

// Profile all major modules
function profileAll() {
  const modules = [
    'react',
    'react-dom',
    'framer-motion',
    'localforage',
    'epubjs',
    'zustand',
    'lucide-react'
  ];
  
  console.log('\n📊 Profiling all modules...\n');
  console.log('Module Name          | Load Time | Heap Delta | Status');
  console.log('---------------------|-----------|------------|--------');
  
  let totalTime = 0;
  let totalHeap = 0;
  
  for (const mod of modules) {
    const result = profileModule(mod);
    if (result.success) {
      const time = parseFloat(result.loadTime);
      const heap = parseFloat(result.heapDelta);
      totalTime += time;
      totalHeap += heap;
      console.log(
        `${mod.padEnd(20)} | ${result.loadTime.padStart(9)} | ${result.heapDelta.padStart(10)} | ✅`
      );
    } else {
      console.log(
        `${mod.padEnd(20)} |     N/A   |     N/A    | ❌ ${result.error}`
      );
    }
  }
  
  console.log('---------------------|-----------|------------|--------');
  console.log(`TOTAL                | ${totalTime.toFixed(2).padStart(9)}ms | ${totalHeap.toFixed(2).padStart(10)}MB |`);
}

// Main execution
if (targetModule === '--all') {
  profileAll();
} else {
  console.log(`\n📊 Profiling module: ${targetModule}\n`);
  const result = profileModule(targetModule);
  
  if (result.success) {
    console.log(`✅ ${targetModule} loaded successfully`);
    console.log(`   Load time: ${result.loadTime}`);
    console.log(`   Heap delta: ${result.heapDelta}`);
  } else {
    console.log(`❌ Failed to load ${targetModule}`);
    console.log(`   Error: ${result.error}`);
  }
}

console.log('\n💡 Tip: Use node --cpu-prof --heap-prof to generate detailed profiles');
