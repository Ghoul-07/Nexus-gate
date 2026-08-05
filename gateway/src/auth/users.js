import bcrypt from 'bcrypt';
export const DEMO_USERS = [
    {
        id: 'usr_1',
        username: 'alice',
        passwordHash: '124443',
        role: 'admin'
    },
    {
        id: 'usr_2',
        username: 'bob',
        passwordHash: '124235',
        role: 'developer'
    }
];
console.log("done");
console.log(await bcrypt.hash('alice123', 10));
