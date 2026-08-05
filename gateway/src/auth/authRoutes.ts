import express from 'express'
import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { DEMO_USERS } from './users.js'
import { JWT_SECRET } from '../config.js'

const authRouter = express.Router()

authRouter.post('/login', async(req: Request, res:Response) =>{
  
  const {username, password} = req.body

  if(!username || !password){
    return res.status(400).json({error: 'Bad Request', message:'Username and password required'})
  }

  const user = DEMO_USERS.find(u => u.username === username)
  if(!user){
    return res.status(401).json({error: 'Unauthorized', message:'Invalid credentials'})
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)
  if(!passwordMatches){
    return res.status(401).json({error:' Unauthorized', message:'Invalid Credentials'})
  }


  if(!JWT_SECRET){
    console.error("JWT_SECRET is not set")
    return res.status(500).json({error:'Internal server error'})
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role:user.role},
    JWT_SECRET,
    {expiresIn: '15m'}
  )
  res.json({token})
})

export default authRouter


