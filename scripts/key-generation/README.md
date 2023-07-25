# JSON keystore generation

## What is a keystore file?

A JSON keystore is a file format commonly used to securely store and manage
cryptographic keys associated with cryptocurrency wallets. It provides a
structured and standardized way to store the private key in a JSON format.

Typically, a JSON keystore file contains the encrypted private key along with
relevant metadata and parameters needed for key derivation and decryption. The
metadata may include information such as the key derivation function used,
encryption algorithm, initialization vector (IV), salt, and other necessary
parameters.

The private key is encrypted within the JSON keystore file using a user-defined
password or passphrase. This encryption adds an extra layer of security,
protecting the private key from unauthorized access. The encrypted private key
can only be decrypted and accessed by providing the correct password or
passphrase.

When a user wants to use their crypto wallet, they can import the JSON keystore
file into a wallet software or application that supports this file format (one
of them being the Taho extension). The wallet software will prompt the user to
enter their password or passphrase to decrypt the private key stored in the JSON
file. Once the private key is decrypted, the wallet software can utilize it to
sign transactions and perform other wallet-related operations.

JSON keystore files are designed to be portable, allowing users to easily back
up and transfer their private keys between different wallet applications or
devices while maintaining a standardized format. However, it's crucial to
protect the JSON keystore file and the associated password or passphrase since
they provide access to the private key and, ultimately, control over the
associated cryptocurrency funds.

## Generating JSON keystore for a private key

In order to produce a keystore file run:

```sh
$ yarn install # installs dependencies
$ PRIVATE_KEY="<private key without the 0x prefix>" PASSWORD="<password>" yarn run generate # executes the script
```

As a result a JSON keystore file encoding the provided private key with the
provided password will be created in the current directory.

## Credits

The script was based on a solution suggested in
[this comment](https://ethereum.stackexchange.com/a/55617).
