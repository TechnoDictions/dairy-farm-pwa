'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
 
export default function livestockManager(){
    const  [tag , setTag] =useState('');
    const  [name , setName] = useState('');
    const  [breed , setBreed] = useState('');
    const  [status , setStatus] = useState<string>('Lactating');

    const livestockList = useLiveQuery(() => db.Livestock.toArray());
     

    const handleAddLivestock = async (e : React.FormEvent) => {
        e.preventDefault();
        if (!tag.trim() || !name.trim()) return;

        await db.Livestock.add({
            tag,
            name,
            breed,
            status,
        });
        setTag('');
        setName('');
        setBreed('');
    };

    return(
       <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-md space-y-6 text-gray-800">
      <h1 className="text-2xl font-bold text-gray-900">Dairy Farm Livestock</h1>

      {/* Form to Add Animal */}
      <form onSubmit={handleAddLivestock} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Tag Number</label>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. COW-001"
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bella"
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Breed</label>
          <input
            type="text"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="e.g. Holstein / Sahiwal"
            className="w-full p-2 border rounded-md"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md"
        >
          Add Animal to Local Storage
        </button>
      </form>

      {/* List Display */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Saved Animals ({livestockList?.length || 0})</h2>
        <ul className="divide-y divide-gray-200">
          {livestockList?.map((animal) => (
            <li key={animal.id} className="py-2 flex justify-between items-center">
              <div>
                <p className="font-bold">{animal.name} ({animal.tag})</p>
                <p className="text-sm text-gray-500">Breed: {animal.breed || 'N/A'}</p>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                {animal.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
    )
}

