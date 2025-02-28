import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';

const Task = () => {
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [select, setSelected] = useState([]);

    const fetch = async () => {
        try {
            const res = await axios.get('https://jsonplaceholder.typicode.com/photos');
            setData(res.data); 
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        fetch();
    }, []);

    const handleSelect = (item) => {
        if (!select.some((selectedItem) => selectedItem.id === item.id)) {
            setSelected([...select, item]);
        }
    };

    const handleRemove = (id) => {
        setSelected(select.filter((item) => item.id !== id));
    };

    const filteredData = data.filter((item) => 
        item.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div>
                {select.map((item) => (
                    <div key={item.id}>
                        {item.title.slice(0, 2).toUpperCase()}
                        <button onClick={() => handleRemove(item.id)}>
                            <X/>
                        </button>
                    </div>
                ))}
            </div>

            <input 
                type="text" 
                placeholder="Search..."
                className='border-2' 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
            />

            <div>
                {search && filteredData.map((item) => (
                    <div key={item.id} onClick={() => handleSelect(item)}>
                        {item.title}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Task;