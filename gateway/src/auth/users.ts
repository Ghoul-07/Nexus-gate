export interface DemoUser{
  id: string,
  username: string,
  passwordHash: string,
  role: 'admin' | 'developer'
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'usr_1',
    username:'alice',
    passwordHash:'$2b$10$8IHhbZSr/5GIhWGQHo3PcuCfPvsC4IikSARNNOTBTn3Bz5R9b3mCC',
    role:'admin'
  },
  {
    id:'usr_2',
    username:'bob',
    passwordHash:'$2b$10$5k1gznes08HglK/Z7oGjHu.A.ofW7htlY4Z/YF/T2wOfid8tLdr5G',
    role:'developer'
  }
]

