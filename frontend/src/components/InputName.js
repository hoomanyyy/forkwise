import React from "react";
import "../styles/Inputs.css"
import "bootstrap/dist/css/bootstrap.min.css"

export function InputBorder({ placeholder , width , onChange , type}){
    return(
        <div>
            <input 
                placeholder={placeholder}
                style={{ width: width }} 
                type={type} 
                onChange={onChange} 
                className="InputBorder" 
            />
        </div>
    )
}

export function InputIcon({ placeholder , type , width , onChange , Icon}){
    return (
        <div className="EmailContainerInput p-2 d-flex">
            <Icon />
            <input
                type={type}
                className="EmailInput"
                placeholder={placeholder}
                onChange={onChange}
                style={{ width: width }}
            />
        </div>
    )
}