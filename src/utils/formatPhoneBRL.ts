const MAX_DIGITS = 11; // 2 DDD + 9 número


/** Remove tudo que não for dígito e limita ao tamanho máximo */
export function digitsOnly(value: string): string {
    return value.replace(/\D/g, '').slice(0, MAX_DIGITS);
}
  

/** Formata para exibição: (XX) XXXXX-XXXX */
export function formatPhoneDisplay(digits: string): string {
    const d = digitsOnly(digits);
    if (d.length <= 2) return d.replace(/(\d{2})/, '($1) ');
    return d
      .replace(/(\d{2})(\d{5})(\d{0,4})/, (_, ddd, mid, end) => {
        if (!end) return `(${ddd}) ${mid}`;
        return `(${ddd}) ${mid}-${end}`;
      })
      .trim();
  }