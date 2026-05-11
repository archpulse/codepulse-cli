import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { t } from '../utils/i18n';

const LICENSES: Record<string, string> = {
  mit: `MIT License

Copyright (c) {YEAR} {NAME}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
  isc: `ISC License

Copyright (c) {YEAR}, {NAME}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS 
SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. 
IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, 
OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS 
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE 
OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE 
OR PERFORMANCE OF THIS SOFTWARE.`,
  'bsd-2': `BSD 2-Clause License

Copyright (c) {YEAR}, {NAME}
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
  'bsd-3': `BSD 3-Clause License

Copyright (c) {YEAR}, {NAME}
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
  unlicense: `This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org/>`,
  apache: `Apache License Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright {YEAR} {NAME}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`,
  gpl: `GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007
Copyright (C) {YEAR} {NAME}
Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.
... (Full GPLv3 text usually included here, abbreviated for CLI size)`,
  agpl: `GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007
Copyright (C) {YEAR} {NAME}
... (Full AGPLv3 text abbreviated)`,
  lgpl: `GNU LESSER GENERAL PUBLIC LICENSE Version 3, 29 June 2007
Copyright (C) {YEAR} {NAME}
... (Full LGPLv3 text abbreviated)`,
  mpl: `Mozilla Public License Version 2.0
... (Full MPL 2.0 text abbreviated)`
};

const LICENSE_DESC_KEYS: Record<string, string> = {
  mit: 'license.desc.mit',
  isc: 'license.desc.isc',
  'bsd-2': 'license.desc.bsd2',
  'bsd-3': 'license.desc.bsd3',
  unlicense: 'license.desc.unlicense',
  apache: 'license.desc.apache',
  mpl: 'license.desc.mpl',
  gpl: 'license.desc.gpl',
  agpl: 'license.desc.agpl',
  lgpl: 'license.desc.lgpl'
};

export function runLicense(type: string, name: string = 'Your Name'): void {
  const isWin = process.platform === 'win32';
  const check = isWin ? 'v' : '✓';
  
  if (type === 'help') {
    console.log('\n' + chalk.bold.cyan(`  ${t('license.supported')}`));
    console.log(chalk.gray('  ─────────────────────────────'));
    Object.keys(LICENSES).forEach(key => {
      const desc = t(LICENSE_DESC_KEYS[key] || '');
      console.log(`  - ${chalk.yellow(key.padEnd(10))} ${chalk.gray('—')} ${chalk.white(desc)}`);
    });
    console.log(chalk.gray(`\n  ${t('license.usage')}\n`));
    return;
  }

  const licenseBody = LICENSES[type.toLowerCase()];
  if (!licenseBody) {
    console.error(chalk.red(`\n  ${t('license.unknown', { type })}`));
    console.log(chalk.gray(`  ${t('license.available', { list: Object.keys(LICENSES).join(', ') })}\n`));
    process.exit(1);
  }

  const finalLicense = licenseBody
    .replace('{YEAR}', new Date().getFullYear().toString())
    .replace('{NAME}', name);

  const dest = path.join(process.cwd(), 'LICENSE');
  fs.writeFileSync(dest, finalLicense);

  console.log(chalk.green(`\n  ${check} ${t('license.success', { type: type.toUpperCase() })}`));
}
