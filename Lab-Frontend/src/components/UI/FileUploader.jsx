import React from 'react'


export default function FileUploader({ onFile }){
return (
<input type="file" onChange={e=>onFile && onFile(e.target.files[0])} />
)
}