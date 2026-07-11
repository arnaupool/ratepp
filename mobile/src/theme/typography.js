// Same four weights as the design's original Nunito import, on Poppins.
export const fonts = {
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
  black: 'Poppins_900Black',
};

export const type = {
  screenTitle: { fontFamily: fonts.black, fontSize: 26, lineHeight: 29 },
  cardTitle: { fontFamily: fonts.extrabold, fontSize: 13.5, lineHeight: 17 },
  scoreBadge: { fontFamily: fonts.black, fontSize: 13 },
  scoreBadgeLg: { fontFamily: fonts.black, fontSize: 16 },
  scoreBadgeMini: { fontFamily: fonts.black, fontSize: 11 },
  tagChip: { fontFamily: fonts.bold, fontSize: 10 },
  searchInput: { fontFamily: fonts.semibold, fontSize: 14 },
  // Explicit lineHeight + includeFontPadding:false: without them, Android
  // pads Poppins glyphs with extra vertical font-metric space that isn't
  // accounted for by the chip's fixed paddingVertical, making the chip look
  // squished/off-center (not reproducible on iOS or web, where the default
  // font-padding behavior differs).
  chip: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 16, includeFontPadding: false },
  titleInput: { fontFamily: fonts.black, fontSize: 24 },
  scoreLabel: { fontFamily: fonts.black, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.6 },
  numPill: { fontFamily: fonts.extrabold, fontSize: 12.5 },
  fieldLabel: { fontFamily: fonts.extrabold, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { fontFamily: fonts.semibold, fontSize: 14.5 },
  detailFieldLabel: { fontFamily: fonts.extrabold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailFieldValue: { fontFamily: fonts.semibold, fontSize: 14 },
  detailTitle: { fontFamily: fonts.black, fontSize: 20 },
  personName: { fontFamily: fonts.bold, fontSize: 10.5 },
  loginTitle: { fontFamily: fonts.black, fontSize: 25 },
  loginSub: { fontFamily: fonts.semibold, fontSize: 13 },
  loginLabel: { fontFamily: fonts.extrabold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  loginInput: { fontFamily: fonts.semibold, fontSize: 15 },
  loginBtn: { fontFamily: fonts.extrabold, fontSize: 15 },
  loginSwitch: { fontFamily: fonts.semibold, fontSize: 13 },
  sheetTitle: { fontFamily: fonts.black, fontSize: 17 },
  sheetItemLabel: { fontFamily: fonts.bold, fontSize: 13 },
  quickChip: { fontFamily: fonts.extrabold, fontSize: 12.5 },
  listAdd: { fontFamily: fonts.bold, fontSize: 12 },
  editContext: { fontFamily: fonts.bold, fontSize: 11 },
  logoLetter: { fontFamily: fonts.black, fontSize: 26 },
};
