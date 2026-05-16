import fs from 'fs';
import path from 'path';

const files = fs.readdirSync('src/content/albums');
console.log('Albums:', files);

const portfolioFiles = fs.readdirSync('src/content/portfolio');
console.log('Portfolio folders:', portfolioFiles);
