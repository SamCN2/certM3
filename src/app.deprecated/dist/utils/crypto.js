"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKeyPair = generateKeyPair;
exports.generateCSR = generateCSR;
const forge = __importStar(require("node-forge"));
async function generateKeyPair() {
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
    };
}
async function generateCSR(keyPair, subject) {
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keyPair.publicKey;
    // Set subject attributes
    csr.setSubject([
        { name: 'commonName', value: subject.username },
        { name: 'organizationName', value: subject.organization },
        { name: 'organizationalUnitName', value: subject.organizationalUnit },
        { name: 'localityName', value: subject.locality },
        { name: 'stateOrProvinceName', value: subject.state },
        { name: 'countryName', value: subject.country }
    ]);
    // Add extensions
    const extensions = [{
            name: 'extensionRequest',
            extensions: [
                {
                    name: 'subjectAltName',
                    altNames: [{
                            type: 2, // DNS
                            value: subject.username
                        }]
                },
                {
                    name: 'groups',
                    value: JSON.stringify({ groups: subject.groups })
                }
            ]
        }];
    csr.setAttributes(extensions);
    csr.sign(keyPair.privateKey, forge.md.sha256.create());
    return forge.pki.certificationRequestToPem(csr);
}
//# sourceMappingURL=crypto.js.map