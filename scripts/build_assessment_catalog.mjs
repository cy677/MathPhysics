// Public capabilities only. Never include issued definitions, seeds or grading data.
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {catalog} from '../server/assessments.mjs';
const output=fileURLToPath(new URL('../config/assessment-catalog.json',import.meta.url));
writeFileSync(output,JSON.stringify(catalog(),null,2)+'\n','utf8');
console.log(output);
