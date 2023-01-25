import * as blake from "blakejs"
import base32Decode from "base32-decode"
import BN from "bn.js"

// @ts-ignore
import leb from "leb128"

export class UnknownProtocolIndicator extends Error {
    constructor(...args: any[]) {
        super(...args)
        this.message = "Unknown protocol indicator byte."
    }
}

export class InvalidPayloadLength extends Error {
    constructor(...args: any[]) {
        super(...args)
        this.message = "Invalid payload length."
    }
}

export class InvalidNamespace extends Error {
    constructor(...args: any[]) {
        super(...args)
        this.message = "Invalid namespace."
    }
}

export class InvalidSubAddress extends Error {
    constructor(...args: any[]) {
        super(...args)
        this.message = "Invalid subAddress."
    }
}

export class ProtocolNotSupported extends Error {
    constructor(protocolName: string, ...args: any[]) {
        super(...args)
        this.message = `${protocolName} protocol not supported.`
    }
}

export class InvalidChecksumAddress extends Error {
    constructor(...args: any[]) {
        super(...args)
        this.message = `Invalid address (checksum not matching the payload).`
    }
}

export class InvalidPrivateKeyFormat extends Error {
    constructor(...args: any[]) {
        super(...args)
        this.message = "Private key need to be an instance of Buffer or a base64 string."
    }
}

export const ProtocolIndicator = {
    ID: 0,
    SECP256K1: 1,
    ACTOR: 2,
    BLS: 3,
    DELEGATED: 4,
}

export function getChecksum(payload: Buffer): Buffer {
    const blakeCtx = blake.blake2bInit(4)
    blake.blake2bUpdate(blakeCtx, payload)
    return Buffer.from(blake.blake2bFinal(blakeCtx))
}

export function addressAsBytes(address: string): Buffer {
    let address_decoded, payload, checksum
    const protocolIndicator = address[1]
    const protocolIndicatorByte = `0${protocolIndicator}`

    switch (Number(protocolIndicator)) {
        case ProtocolIndicator.ID:
            if (address.length > 18) {
                throw new InvalidPayloadLength()
            }
            return Buffer.concat([
                Buffer.from(protocolIndicatorByte, "hex"),
                Buffer.from(leb.unsigned.encode(address.substr(2))),
            ])
        case ProtocolIndicator.SECP256K1:
            address_decoded = base32Decode(address.slice(2).toUpperCase(), "RFC4648")

            payload = address_decoded.slice(0, -4)
            checksum = Buffer.from(address_decoded.slice(-4))

            if (payload.byteLength !== 20) {
                throw new InvalidPayloadLength()
            }
            break
        case ProtocolIndicator.ACTOR:
            address_decoded = base32Decode(address.slice(2).toUpperCase(), "RFC4648")

            payload = address_decoded.slice(0, -4)
            checksum = Buffer.from(address_decoded.slice(-4))

            if (payload.byteLength !== 20) {
                throw new InvalidPayloadLength()
            }
            break
        case ProtocolIndicator.BLS:
            address_decoded = base32Decode(address.slice(2).toUpperCase(), "RFC4648")

            payload = address_decoded.slice(0, -4)
            checksum = Buffer.from(address_decoded.slice(-4))

            if (payload.byteLength !== 48) {
                throw new InvalidPayloadLength()
            }
            break
        case ProtocolIndicator.DELEGATED:
            return delegatedAddressAsBytes(address)
        default:
            throw new UnknownProtocolIndicator()
    }

    const bytes_address = Buffer.concat([
        Buffer.from(protocolIndicatorByte, "hex"),
        Buffer.from(payload),
    ])

    if (getChecksum(bytes_address).toString("hex") !== checksum.toString("hex")) {
        throw new InvalidChecksumAddress()
    }

    return bytes_address
}

function delegatedAddressAsBytes(address: string): Buffer {
    const protocolIndicator = address[1]

    const namespaceRaw = address.slice(2, address.indexOf("f", 2))
    const subAddressRaw = address.slice(address.indexOf("f", 2) + 1)
    const address_decoded = base32Decode(subAddressRaw.toUpperCase(), "RFC4648")

    const namespaceBuff = new BN(namespaceRaw, 10).toBuffer("be", 8)
    const namespaceBytes = Buffer.from(leb.unsigned.encode(namespaceBuff))
    const protocolBytes = Buffer.from(leb.unsigned.encode(protocolIndicator))
    const bytes_address = Buffer.concat([
        protocolBytes,
        namespaceBytes,
        Buffer.from(address_decoded.slice(0, -4)),
    ])
    const checksum = Buffer.from(address_decoded.slice(-4))

    if (getChecksum(bytes_address).toString("hex") !== checksum.toString("hex")) {
        throw new InvalidChecksumAddress()
    }

    return bytes_address
}

console.log(
    "Deploying smart contract...",
    addressAsBytes(
        "t3wj7cikpzptshfuwqleehoytar2wcvom42q6io7lopbl2yp2kb2yh3ymxovsd5ccrgm36ckeibzjl3s27pzuq"
    )
)
