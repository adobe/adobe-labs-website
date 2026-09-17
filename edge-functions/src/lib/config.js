/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { SecretStore } from 'fastly:secret-store';

export class SecretStoreManager {
  static instance = null;

  constructor() {
    this.store = null;
    this.secretsMap = null;
    this.secretsMapLoaded = false;
  }

  static getInstance() {
    if (!SecretStoreManager.instance) {
      SecretStoreManager.instance = new SecretStoreManager();
    }
    return SecretStoreManager.instance;
  }

  async getSecret(key) {
    if (!this.store) {
      this.store = new SecretStore('secret_default');
    }

    if (!this.secretsMapLoaded) {
      this.secretsMapLoaded = true;
      try {
        const secretsEntry = await this.store.get('secrets');
        if (secretsEntry) {
          this.secretsMap = JSON.parse(secretsEntry.plaintext());
        }
      } catch {
        this.secretsMap = null;
      }
    }

    if (this.secretsMap && key in this.secretsMap) {
      return this.secretsMap[key];
    }

    const secret = await this.store.get(key);
    if (!secret) {
      throw new Error(`Secret '${key}' not found in store`);
    }
    return secret.plaintext();
  }

  static async getSecret(key) {
    const instance = SecretStoreManager.getInstance();
    return instance.getSecret(key);
  }
}
