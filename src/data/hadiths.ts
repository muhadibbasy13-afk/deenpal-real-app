
export interface Hadith {
  id: string;
  book: string;
  narrator: string;
  number: number;
  text: string;
  reference: string;
}

export const HADITH_COLLECTIONS = [
  {
    id: 'bukhari',
    name: 'Sahih al-Bukhari',
    hadiths: [
      {
        id: 'b1',
        book: 'Revelación',
        narrator: 'Umar bin Al-Khattab',
        number: 1,
        text: 'He oído al Mensajero de Allah (SAW) decir: "Las acciones son según las intenciones, y cada persona tendrá lo que haya tenido la intención de hacer..."',
        reference: 'Sahih al-Bukhari 1'
      },
      {
        id: 'b2',
        book: 'Creencia',
        narrator: 'Abdullah bin Umar',
        number: 8,
        text: 'El Mensajero de Allah (SAW) dijo: "El Islam se basa en cinco pilares: Testificar que no hay más divinidad que Allah y que Muhammad es el Mensajero de Allah, realizar la oración, pagar el Zakat, realizar el Hajj y ayunar en Ramadán."',
        reference: 'Sahih al-Bukhari 8'
      }
    ]
  },
  {
    id: 'muslim',
    name: 'Sahih Muslim',
    hadiths: [
      {
        id: 'm1',
        book: 'Fe',
        narrator: 'Abu Hurairah',
        number: 1,
        text: 'El Mensajero de Allah (SAW) dijo: "La fe tiene más de setenta ramas, y la modestia (Haya) es una rama de la fe."',
        reference: 'Sahih Muslim 1'
      }
    ]
  },
  {
    id: 'nawawi',
    name: '40 Hadices de An-Nawawi',
    hadiths: [
      {
        id: 'n1',
        book: 'Fundamentos',
        narrator: 'Umar bin Al-Khattab',
        number: 1,
        text: 'Las acciones son según las intenciones...',
        reference: 'An-Nawawi 1'
      },
      {
        id: 'n2',
        book: 'Fundamentos',
        narrator: 'Umar bin Al-Khattab',
        number: 2,
        text: 'Un día, mientras estábamos sentados con el Mensajero de Allah (SAW), apareció un hombre con ropas extremadamente blancas y cabello extremadamente negro... (El Hadiz de Jibril sobre el Islam, Iman e Ihsan).',
        reference: 'An-Nawawi 2'
      }
    ]
  }
];
