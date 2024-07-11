"use client"

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';


export default function CalendarHandler() {
  const [text, setText] = useState('Your calendar data will appear here.');

  const handleCopyClick = () => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8 text-blue-600">Calendar Handler</h1>
      
      <Button className="mb-8 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
        Nice Button
      </Button>
      <GoogleLogin
        onSuccess={credentialResponse => {
          console.log(credentialResponse);
        }}
        onError={() => {
          console.log('Login Failed');
        }}
      />;

 
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <div className="bg-white p-4 rounded-md mb-4 min-h-[100px] border border-gray-300">
            {text}
          </div>
          <Button 
            onClick={handleCopyClick}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded flex items-center justify-center"
          >
            <Copy className="mr-2" size={16} />
            Copy Text
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}