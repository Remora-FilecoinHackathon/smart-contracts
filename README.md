# Project Setup

Run the following command to setup the project:

```shell
git clone https://github.com/Remora-FilecoinHackathon/smart-contracts
cd smart-contracts
npm i
touch .env
```
Insert your private keys inside the .env file, in a variable called PRIVATE_KEY_LENDER and a variable called PRIVATE_KEY_BORROWER (must be 2 different private keys)
(See here for tutorial on how to export private key from metamask: https://metamask.zendesk.com/hc/en-us/articles/360015289632-How-to-export-an-account-s-private-key)

```properties
PRIVATE_KEY_LENDER=<private_key_exported>
PRIVATE_KEY_BORROWER=<private_key_exported>
```

Fund the address related with the private key here: https://hyperspace.yoga/#faucet

Inside the root directory, run the following command:

```shell
npx hardhat run scripts/deploy.ts
```

You should see the following output


<kbd>
<img width="870" alt="Screenshot 2023-01-26 alle 17 47 59" src="https://user-images.githubusercontent.com/56132403/214896991-330bcf0b-1055-4b2a-8e60-e0e0d760527a.png">
</kbd>

# Test
To run the tests run the following command. Add tests to the test directory.
```shell
npx hardhat test --network hardhat
```

## TODO
- ~~)Finish implementing the Escrow contract
- Check why Zondax API does not work
- Write automated tests inside "test" directory (https://hardhat.org/tutorial/testing-contracts)
