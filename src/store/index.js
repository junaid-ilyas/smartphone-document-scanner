import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import scannerReducer from './scannerSlice';
export const store = configureStore({
    reducer: {
        scanner: scannerReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false,
    }),
});
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
