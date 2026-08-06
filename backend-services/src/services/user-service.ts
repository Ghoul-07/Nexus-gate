import express from 'express'
import type { Request, Response } from 'express'

const userApp = express()
const PORT = process.env.PORT || 4001

userApp.use(express.json())

userApp.get('/health',(req:Request, res: Response) =>{
  res.json({status:'UP', service:'User Service'})
})
userApp.get('/users', (req:Request, res:Response)=>{
 
  console.log(`[User Service ${PORT}] handling /users`)

  res.json({
    service:'User Service',
    data:[
      { id: 'usr_1', name: 'Alice', role: 'Admin' },
      { id: 'usr_2', name: 'Bob', role: 'Developer' },
    ]
  })
})

userApp.listen(PORT, ()=>{
  console.log(`[User Service] running on PORT ${PORT}`)
})
