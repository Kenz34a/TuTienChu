import { PHASE_COUNT } from './stages';
import { REALMS, STAGES } from './data';

const methods = [
  [
    'Khai Mạch Dẫn Khí',
    'Dẫn linh khí vào kinh mạch, ổn định chu thiên.',
    'Khai mạch → thông mạch → tụ khí.',
    'Ngưng khí thành dịch, dựng nền Trúc Cơ.',
  ],
  [
    'Ngưng Tụ Đạo Cơ',
    'Nén linh lực trong đan điền, củng cố nền móng.',
    'Đạo cơ sơ thành → đạo cơ vững chắc → đạo cơ viên mãn.',
    'Kết tinh linh lực, ngưng tụ Kim Đan.',
  ],
  [
    'Cửu Chuyển Kim Đan',
    'Vận chuyển linh khí để luyện hóa và tăng phẩm Kim Đan.',
    'Luyện đan sơ chuyển → đan tâm tinh thuần → Kim Đan viên mãn.',
    'Toái đan thành anh, thai nghén Nguyên Anh.',
  ],
  [
    'Dưỡng Anh Xuất Khiếu',
    'Nuôi dưỡng Nguyên Anh và mở rộng thần thức.',
    'Dưỡng anh → xuất khiếu → anh thể viên mãn.',
    'Dung hợp Nguyên Anh với thần thức, ngưng nguyên thần.',
  ],
  [
    'Nguyên Thần Hợp Nhất',
    'Nguyên thần hóa hình, thần thức điều khiển linh lực.',
    'Ngưng thần → luyện thần → hóa thần viên mãn.',
    'Cảm ngộ hư không, bước vào Luyện Hư.',
  ],
  [
    'Luyện Hư Ngộ Đạo',
    'Luyện hóa hư không để hình thành đạo vực.',
    'Cảm hư → luyện hư → hư không viên mãn.',
    'Dung hợp thân, anh và thần thành một thể.',
  ],
  [
    'Tam Nguyên Hợp Thể',
    'Thân thể, linh lực và nguyên thần cùng cộng hưởng.',
    'Hợp nguyên → hợp đạo → hợp thể viên mãn.',
    'Mở rộng đạo vực, tiến vào Đại Thừa.',
  ],
  [
    'Đại Đạo Viên Thành',
    'Đạo vực trở nên vững chắc, tích lũy sức chống thiên kiếp.',
    'Lập đạo → diễn đạo → đại đạo viên thành.',
    'Dẫn động thiên kiếp, bước vào Độ Kiếp.',
  ],
  [
    'Cửu Trọng Thiên Kiếp',
    'Dùng đạo cơ chống lôi kiếp, luyện hóa thân phàm.',
    'Kiếp vân sơ tụ → lôi kiếp tôi thể → kiếp tâm viên mãn.',
    'Vượt tiên kiếp, hóa tiên thể và mở Tiên giới.',
  ],
  [
    'Tiên Thể Khai Nguyên',
    'Chuyển linh lực thành tiên nguyên, luyện tiên thể.',
    'Tiên nguyên sơ sinh → tiên thể vững chắc → chân tiên viên mãn.',
    'Luyện tiên nguyên thành huyền khí, vào Huyền Tiên.',
  ],
  [
    'Huyền Khí Quy Nhất',
    'Gom huyền khí, tìm chân ý của tiên đạo.',
    'Ngộ huyền → luyện huyền → huyền ý viên mãn.',
    'Đúc bất hoại tiên thân, bước vào Kim Tiên.',
  ],
  [
    'Bất Hoại Kim Thân',
    'Tiên thân bất hoại, tiên nguyên ngưng như vàng ròng.',
    'Đúc kim thân → luyện kim thân → bất hoại viên mãn.',
    'Cảm ngộ Thái Ất pháp tắc, ngưng tiên đạo.',
  ],
  [
    'Thái Ất Ngưng Đạo',
    'Luyện pháp tắc thành đạo ấn Thái Ất.',
    'Ngưng đạo ấn → diễn pháp tắc → Thái Ất viên mãn.',
    'Vượt ràng buộc không gian, cảm ngộ Đại La.',
  ],
  [
    'Đại La Siêu Thoát',
    'Tiên đạo vượt thời không, ý niệm nối thiên địa.',
    'Ngộ thời không → hợp thời không → Đại La viên mãn.',
    'Lập vương đạo, xây dựng tiên vực.',
  ],
  [
    'Tiên Vực Xưng Vương',
    'Tiên vực ổn định, pháp tắc chịu sự điều khiển của đạo tâm.',
    'Lập tiên vực → ngự tiên vực → tiên vương viên mãn.',
    'Hợp vạn pháp thành đế đạo, tiến vào Tiên Đế.',
  ],
  [
    'Vạn Pháp Đế Đạo',
    'Tiên đạo dung hợp vạn pháp, đạo uy bao trùm tiên vực.',
    'Ngưng đế ấn → luyện đế đạo → tiên đế viên mãn.',
    'Chuyển tiên nguyên thành thần lực, mở Thần giới.',
  ],
  [
    'Thần Cách Sơ Sinh',
    'Thần lực nuôi thần cách, dựng thần vực đầu tiên.',
    'Ngưng thần cách → dưỡng thần cách → chân thần viên mãn.',
    'Dung thần cách với thiên đạo, vào Thiên Thần.',
  ],
  [
    'Thiên Đạo Hợp Thần',
    'Thần vực cộng hưởng với thiên đạo và các pháp tắc.',
    'Hợp thiên đạo → ngự thiên đạo → thiên thần viên mãn.',
    'Đúc vương ấn thần vực, bước vào Thần Vương.',
  ],
  [
    'Thần Vực Xưng Vương',
    'Vương ấn điều khiển thần vực, thần lực tăng trưởng vững chắc.',
    'Lập vương ấn → luyện vương ấn → thần vương viên mãn.',
    'Hợp thần vực thành đế giới, tiến vào Thần Đế.',
  ],
  [
    'Hồng Mông Quy Nguyên',
    'Thần cách, đế giới và pháp tắc trở về nguồn gốc thiên đạo.',
    'Ngưng đế giới → hợp hồng mông → Thần Đế Đỉnh phong.',
    'Đỉnh cao hiện tại của tam giới; tiếp tục thu thập danh hiệu, truyền thừa và vượt phó bản.',
  ],
] as const;
export const REALM_METHODS = methods.map(([name, lore, phases, ascent], i) => ({
  realm: REALMS[i],
  minStage: i * PHASE_COUNT,
  name,
  lore,
  phases: phases
    .split(' → ')
    .flatMap((part, i) =>
      i === 2 ? ['Hậu kỳ: luyện hóa linh lực, củng cố đạo pháp', part] : [part],
    )
    .join(' → '),
  ascent,
}));
export const currentRealmMethod = (stage: number) => ({
  ...REALM_METHODS[Math.floor(stage / PHASE_COUNT)],
  phase: STAGES[stage % PHASE_COUNT],
  ascending: stage % PHASE_COUNT === PHASE_COUNT - 1,
});
