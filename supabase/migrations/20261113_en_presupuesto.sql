-- Productos elegidos para comprar: solo estos suman en los totales
alter table public.productos add column if not exists en_presupuesto boolean not null default false;
